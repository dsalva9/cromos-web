import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: lemon-webhook
 *
 * Receives `order_completed` webhook events from LemonSqueezy.
 * On a successful order it:
 *   1. Validates the HMAC-SHA256 signature
 *   2. Checks idempotency (deduplicates via payment_events table)
 *   3. Grants highlight credits to the buyer via `purchase_highlight_credits()`
 *   4. Auto-activates the highlight via `activate_highlight_for_user()`
 *
 * Custom data expected in meta.custom_data:
 *   { user_id: string, listing_id: string, duration: "48_hours"|"7_days" }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
};

// Credit amounts per duration
const CREDIT_AMOUNTS: Record<string, number> = {
  "48_hours": 100,
  "7_days": 300,
};

// ---------------------------------------------------------------------------
// Signature validation
// ---------------------------------------------------------------------------
async function verifySignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const webhookSecret = Deno.env.get("LS_WEBHOOK_SECRET");
  const isLocalDev = Deno.env.get("LOCAL_DEV") === "true";

  const rawBody = await req.text();
  let payload: any;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  // ---------------------------------------------------------------------------
  // Signature check (skip in local dev mode)
  // ---------------------------------------------------------------------------
  if (!isLocalDev) {
    const signature = req.headers.get("x-signature");
    if (!webhookSecret) {
      console.error("LS_WEBHOOK_SECRET not configured");
      return new Response("Server misconfigured", {
        status: 500,
        headers: corsHeaders,
      });
    }
    const valid = await verifySignature(rawBody, signature, webhookSecret);
    if (!valid) {
      console.warn("Invalid webhook signature");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
  }

  // ---------------------------------------------------------------------------
  // Only handle order_created (LS fires this when payment succeeds)
  // ---------------------------------------------------------------------------
  const eventName: string = payload?.meta?.event_name;
  if (eventName !== "order_created") {
    // Acknowledge but do nothing
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---------------------------------------------------------------------------
  // Extract custom data
  // ---------------------------------------------------------------------------
  const customData = payload?.meta?.custom_data ?? {};
  const userId: string | undefined = customData.user_id;
  const listingId: string | undefined = customData.listing_id;
  const duration: string | undefined = customData.duration;
  const lsOrderId: string | undefined =
    payload?.data?.id ?? payload?.data?.attributes?.order_number?.toString();

  if (!userId || !listingId || !duration) {
    console.error("Missing required custom_data fields", {
      userId,
      listingId,
      duration,
    });
    return new Response(
      JSON.stringify({ error: "Missing custom_data: user_id, listing_id, or duration" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!CREDIT_AMOUNTS[duration]) {
    return new Response(
      JSON.stringify({ error: `Unknown duration: ${duration}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ---------------------------------------------------------------------------
  // Supabase admin client (bypasses RLS)
  // ---------------------------------------------------------------------------
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ---------------------------------------------------------------------------
  // Idempotency check
  // ---------------------------------------------------------------------------
  if (lsOrderId) {
    const { data: existing } = await supabase
      .from("payment_events")
      .select("id")
      .eq("ls_event_id", lsOrderId)
      .maybeSingle();

    if (existing) {
      console.log("Duplicate webhook, already processed:", lsOrderId);
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Record the event (idempotency log)
  // ---------------------------------------------------------------------------
  await supabase.from("payment_events").insert({
    user_id: userId,
    event_type: eventName,
    ls_event_id: lsOrderId ?? null,
    payload: payload,
  });

  // ---------------------------------------------------------------------------
  // Grant credits
  // ---------------------------------------------------------------------------
  const creditAmount = CREDIT_AMOUNTS[duration];

  const { error: creditError } = await supabase.rpc(
    "purchase_highlight_credits",
    {
      p_user_id: userId,
      p_amount: creditAmount,
      p_source: "ls_purchase",
      p_ls_order_id: lsOrderId ?? null,
    }
  );

  if (creditError) {
    console.error("Error granting credits:", creditError);
    return new Response(
      JSON.stringify({ error: "Failed to grant credits", detail: creditError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ---------------------------------------------------------------------------
  // Activate highlight
  // ---------------------------------------------------------------------------
  const { data: highlightResult, error: highlightError } = await supabase.rpc(
    "activate_highlight_for_user",
    {
      p_user_id: userId,
      p_listing_id: parseInt(listingId, 10),
      p_duration: duration,
      p_ls_order_id: lsOrderId ?? null,
    }
  );

  if (highlightError) {
    console.error("Error activating highlight:", highlightError);
    // Don't fail the webhook — credits were already granted.
    // The user can manually activate from My Listings in the future.
    return new Response(
      JSON.stringify({
        received: true,
        credits_granted: true,
        highlight_activated: false,
        error: highlightError.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log("Highlight activated successfully:", highlightResult);

  return new Response(
    JSON.stringify({
      received: true,
      credits_granted: true,
      highlight_activated: true,
      result: highlightResult,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
