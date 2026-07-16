import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Google AdMob key cache ──────────────────────────────────────────
interface AdMobKey {
  keyId: number;
  pem: string;
  base64: string;
}

let cachedKeys: AdMobKey[] = [];
let cachedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchGoogleKeys(forceRefresh = false): Promise<AdMobKey[]> {
  if (!forceRefresh && cachedKeys.length > 0 && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedKeys;
  }
  const res = await fetch(
    "https://www.gstatic.com/admob/reward/verifier-keys.json"
  );
  if (!res.ok) throw new Error(`Failed to fetch AdMob keys: ${res.status}`);
  const json = await res.json();
  cachedKeys = json.keys as AdMobKey[];
  cachedAt = Date.now();
  return cachedKeys;
}

// ── Helpers ─────────────────────────────────────────────────────────
function base64UrlDecode(input: string): Uint8Array {
  // Convert base64url → standard base64
  let b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  // Pad
  while (b64.length % 4 !== 0) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Convert an ASN.1 DER-encoded ECDSA signature to IEEE P1363 format.
 * Google AdMob sends DER but crypto.subtle.verify expects P1363 (raw r||s).
 * For P-256: output is exactly 64 bytes (32 for r + 32 for s).
 */
function derToP1363(der: Uint8Array, byteLength = 32): Uint8Array {
  // DER structure: 0x30 [total-len] 0x02 [r-len] [r-bytes] 0x02 [s-len] [s-bytes]
  let offset = 0;
  if (der[offset++] !== 0x30) throw new Error("Invalid DER: missing SEQUENCE");
  // Read sequence length (may be 1 or 2 bytes)
  let seqLen = der[offset++];
  if (seqLen & 0x80) {
    // Long form — skip length bytes (very rare for P-256)
    const lenBytes = seqLen & 0x7f;
    offset += lenBytes;
  }

  function readInteger(): Uint8Array {
    if (der[offset++] !== 0x02) throw new Error("Invalid DER: missing INTEGER");
    const len = der[offset++];
    const value = der.slice(offset, offset + len);
    offset += len;
    return value;
  }

  const r = readInteger();
  const s = readInteger();

  // Pad or trim r and s to exactly byteLength bytes
  function padOrTrim(value: Uint8Array): Uint8Array {
    if (value.length === byteLength) return value;
    if (value.length > byteLength) {
      // Leading zero byte from DER (positive integer padding) — trim
      return value.slice(value.length - byteLength);
    }
    // Pad with leading zeros
    const padded = new Uint8Array(byteLength);
    padded.set(value, byteLength - value.length);
    return padded;
  }

  const result = new Uint8Array(byteLength * 2);
  result.set(padOrTrim(r), 0);
  result.set(padOrTrim(s), byteLength);
  return result;
}

async function verifySignature(
  url: URL,
): Promise<boolean> {
  const keyIdStr = url.searchParams.get("key_id");
  const signatureParam = url.searchParams.get("signature");

  if (!keyIdStr || !signatureParam) {
    console.error("[SSV] Missing key_id or signature");
    return false;
  }

  const keyId = Number(keyIdStr);

  // Build the message: query string content before &signature=
  const qs = url.search.substring(1); // remove leading ?
  const sigIndex = qs.indexOf("&signature=");
  if (sigIndex === -1) {
    console.error("[SSV] Could not find &signature= in query string");
    return false;
  }
  const message = qs.substring(0, sigIndex);
  const encodedMessage = new TextEncoder().encode(message);
  const derSignature = base64UrlDecode(signatureParam);
  // Convert DER → IEEE P1363 (raw r||s) for crypto.subtle
  const signatureBytes = derToP1363(derSignature);

  // Try to verify, refreshing keys once if key_id is unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const keys = await fetchGoogleKeys(attempt > 0);
    const keyData = keys.find((k) => k.keyId === keyId);

    if (!keyData) {
      if (attempt === 0) {
        console.warn(`[SSV] Unknown key_id ${keyId}, refreshing keys…`);
        continue;
      }
      console.error(`[SSV] Unknown key_id ${keyId} after refresh`);
      return false;
    }

    // Import the SPKI DER key
    const derBytes = base64UrlDecode(keyData.base64);
    const cryptoKey = await crypto.subtle.importKey(
      "spki",
      derBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      signatureBytes,
      encodedMessage
    );

    return valid;
  }

  return false;
}

// ── Main handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only GET allowed (Google sends GET callbacks)
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);

    // 1. Verify ECDSA signature
    const valid = await verifySignature(url);
    if (!valid) {
      console.error("[SSV] Signature verification failed");
      return new Response("Signature verification failed", {
        status: 403,
        headers: corsHeaders,
      });
    }

    // 2. Extract params
    const userId =
      url.searchParams.get("user_id") ??
      url.searchParams.get("custom_data") ??
      null;
    const transactionId = url.searchParams.get("transaction_id") ?? null;

    if (!userId) {
      console.error("[SSV] Missing user_id / custom_data");
      return new Response("Missing user_id", {
        status: 400,
        headers: corsHeaders,
      });
    }

    console.log(
      `[SSV] Verified callback for user=${userId}, txn=${transactionId}`
    );

    // 3. Call RPC with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase.rpc("earn_rewarded_ad_credits", {
      p_user_id: userId,
      p_transaction_id: transactionId,
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("rate_limited") || msg.includes("daily_limit_reached")) {
        console.warn(`[SSV] Limit hit for user=${userId}: ${msg}`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
      console.error(`[SSV] RPC error: ${JSON.stringify(error)}`);
      return new Response("Internal Server Error", {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(`[SSV] Success for user=${userId}: ${JSON.stringify(data)}`);
    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error(`[SSV] Unexpected error: ${err}`);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
