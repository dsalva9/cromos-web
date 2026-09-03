import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: verify-play-purchase
 *
 * Receives purchase data from the Android app after a Google Play purchase.
 * Validates the purchase token with Google Play Developer API, then:
 *   - For `listing_extra_upload`: grants 1 extra listing unlock
 *   - For `highlight_48h`/`highlight_7d`: purchases highlight credits + activates
 *   - Acknowledges the purchase with Google Play
 *
 * Requires:
 *   - GOOGLE_SERVICE_ACCOUNT_KEY secret (JSON key for Play Developer API)
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (auto-provided)
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Product → action mapping
const PRODUCT_ACTIONS: Record<
  string,
  { type: "listing_unlock" | "highlight"; duration?: string }
> = {
  listing_extra_upload: { type: "listing_unlock" },
  highlight_48h: { type: "highlight", duration: "48_hours" },
  highlight_7d: { type: "highlight", duration: "7_days" },
};

// ---------------------------------------------------------------------------
// Google Play Developer API — verify & acknowledge
// ---------------------------------------------------------------------------

interface GoogleAuthToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: GoogleAuthToken | null = null;

async function getGoogleAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const keyJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");

  const key = JSON.parse(keyJson);
  const now = Math.floor(Date.now() / 1000);

  // Build JWT for Google OAuth2
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const signInput = `${header}.${payload}`;

  // Import the private key for RS256 signing
  const pemContent = key.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signInput)
  );

  const base64Sig = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${payload}.${base64Sig}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google OAuth failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  cachedToken = {
    access_token: tokenData.access_token,
    expires_at: Date.now() + tokenData.expires_in * 1000,
  };

  return cachedToken.access_token;
}

async function verifyPurchase(
  productId: string,
  purchaseToken: string
): Promise<{ valid: boolean; orderId?: string; error?: string }> {
  try {
    const accessToken = await getGoogleAccessToken();
    const packageName = "com.cambiocromos.app";

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[verify-play-purchase] Google API error: ${errBody}`);
      return { valid: false, error: `Google API: ${res.status}` };
    }

    const data = await res.json();

    // purchaseState: 0 = purchased, 1 = cancelled, 2 = pending
    if (data.purchaseState !== 0) {
      return { valid: false, error: `Purchase state: ${data.purchaseState}` };
    }

    return { valid: true, orderId: data.orderId };
  } catch (err: any) {
    console.error("[verify-play-purchase] Verification error:", err);
    return { valid: false, error: err.message };
  }
}

async function acknowledgePurchase(
  productId: string,
  purchaseToken: string
): Promise<void> {
  try {
    const accessToken = await getGoogleAccessToken();
    const packageName = "com.cambiocromos.app";

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}:acknowledge`;

    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    // Non-fatal: Google auto-refunds after 3 days if not acknowledged,
    // but our DB already granted the product. Log and continue.
    console.error("[verify-play-purchase] Acknowledge error:", err);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Authenticate the user via Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { productId, purchaseToken, transactionId } = body;

    if (!productId || !purchaseToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing productId or purchaseToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const action = PRODUCT_ACTIONS[productId];
    if (!action) {
      return new Response(
        JSON.stringify({ ok: false, error: `Unknown product: ${productId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check: has this transaction already been processed?
    const { data: existing } = await supabaseAdmin
      .from("listing_unlock_transactions")
      .select("id")
      .eq("payment_id", transactionId || purchaseToken)
      .limit(1);

    if (existing && existing.length > 0) {
      // Already processed — return success (idempotent)
      return new Response(
        JSON.stringify({ ok: true, message: "Already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check highlight payments for idempotency
    if (action.type === "highlight") {
      const { data: existingPayment } = await supabaseAdmin
        .from("payment_events" as any)
        .select("id")
        .eq("payment_id", transactionId || purchaseToken)
        .limit(1);

      if (existingPayment && existingPayment.length > 0) {
        return new Response(
          JSON.stringify({ ok: true, message: "Already processed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify with Google Play Developer API
    const verification = await verifyPurchase(productId, purchaseToken);
    if (!verification.valid) {
      return new Response(
        JSON.stringify({ ok: false, error: verification.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = transactionId || verification.orderId || purchaseToken;

    // Grant the product
    if (action.type === "listing_unlock") {
      // Grant 1 extra listing upload
      const { error: grantError } = await supabaseAdmin
        .from("listing_unlock_transactions")
        .insert({
          user_id: user.id,
          unlock_source: "purchase",
          amount: 1,
          payment_id: paymentId,
        });

      if (grantError) {
        console.error("[verify-play-purchase] Grant error:", grantError);
        return new Response(
          JSON.stringify({ ok: false, error: "Failed to grant unlock" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (action.type === "highlight" && action.duration) {
      // Grant highlight credits via existing RPC
      const creditAmount = action.duration === "48_hours" ? 100 : 300;

      const { error: creditError } = await supabaseAdmin.rpc(
        "purchase_highlight_credits" as any,
        {
          p_user_id: user.id,
          p_amount: creditAmount,
          p_source: "google_play",
          p_ls_order_id: paymentId,
        }
      );

      if (creditError) {
        console.error("[verify-play-purchase] Credit grant error:", creditError);
        return new Response(
          JSON.stringify({ ok: false, error: "Failed to grant highlight credits" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Acknowledge the purchase with Google
    await acknowledgePurchase(productId, purchaseToken);

    console.info(
      `[verify-play-purchase] ✓ ${productId} for user ${user.id} (${paymentId})`
    );

    return new Response(
      JSON.stringify({ ok: true, paymentId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[verify-play-purchase] Unhandled error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
