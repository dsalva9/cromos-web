// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LS_WEBHOOK_SECRET = Deno.env.get("LS_WEBHOOK_SECRET_SUBSCRIPTION")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Verify LemonSqueezy webhook signature (HMAC SHA-256).
 */
async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  if (!LS_WEBHOOK_SECRET || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LS_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");

  return computed === signature;
}

/**
 * LemonSqueezy subscription webhook.
 * Handles subscription lifecycle events for web purchases.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";

    // Verify HMAC signature
    const isValid = await verifySignature(rawBody, signature);
    if (!isValid) {
      console.error("[ls-webhook] Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload?.meta?.event_name;
    const customData = payload?.meta?.custom_data || {};
    const userId = customData?.user_id;
    const attrs = payload?.data?.attributes || {};

    console.log(`[ls-webhook] Event: ${eventName}, user: ${userId}`);

    if (!userId) {
      console.error("[ls-webhook] No user_id in custom_data");
      return new Response(JSON.stringify({ error: "No user_id" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const lsSubscriptionId = String(payload?.data?.id || "");
    const variantId = String(attrs?.variant_id || "");

    // Determine plan from variant or product name
    const plan = attrs?.variant_name?.toLowerCase()?.includes("anual") ? "yearly" : "monthly";
    const daysToAdd = plan === "yearly" ? 365 : 30;

    switch (eventName) {
      case "subscription_created":
      case "subscription_payment_success": {
        const expiresAt = new Date(Date.now() + daysToAdd * 86400000).toISOString();

        // Check if subscription already exists
        const { data: existing } = await supabase
          .from("pro_subscriptions")
          .select("id")
          .eq("ls_subscription_id", lsSubscriptionId)
          .maybeSingle();

        if (existing) {
          // Renewal — extend expiry
          await supabase.from("pro_subscriptions").update({
            status: "active",
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
        } else {
          // New subscription
          // Expire any existing active subscriptions for this user
          await supabase.from("pro_subscriptions")
            .update({ status: "expired", updated_at: new Date().toISOString() })
            .eq("user_id", userId)
            .in("status", ["trial", "active"]);

          await supabase.from("pro_subscriptions").insert({
            user_id: userId,
            status: "active",
            plan,
            provider: "lemonsqueezy",
            ls_subscription_id: lsSubscriptionId,
            expires_at: expiresAt,
          });
        }

        await supabase.from("profiles").update({
          is_pro: true,
          pro_expires_at: expiresAt,
        }).eq("id", userId);

        // Grant highlight credits
        await supabase.rpc("purchase_highlight_credits", {
          p_user_id: userId,
          p_amount: 800,
          p_source: "admin_grant",
          p_ls_order_id: `ls_${lsSubscriptionId}_${Date.now()}`,
        });

        // Send welcome email
        try {
          const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", userId).single();
          const { data: auth } = await supabase.auth.admin.getUserById(userId);
          if (auth?.user?.email) {
            await fetch(`${SUPABASE_URL}/functions/v1/send-pro-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({
                type: "welcome_subscription",
                user_id: userId,
                email: auth.user.email,
                nickname: profile?.nickname || "",
                plan,
              }),
            });
          }
        } catch (e) { console.error("[ls-webhook] Email error:", e); }

        console.log(`[ls-webhook] Activated/renewed PRO for ${userId}, plan: ${plan}`);
        break;
      }

      case "subscription_updated": {
        // Could be plan change, billing update, etc.
        const status = attrs?.status; // active, past_due, unpaid, cancelled, expired, on_trial, paused
        if (status === "active") {
          await supabase.from("pro_subscriptions")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("ls_subscription_id", lsSubscriptionId);
        } else if (status === "past_due" || status === "unpaid") {
          await supabase.from("pro_subscriptions")
            .update({ status: "on_hold", updated_at: new Date().toISOString() })
            .eq("ls_subscription_id", lsSubscriptionId);
        }
        console.log(`[ls-webhook] Updated sub ${lsSubscriptionId} to ${status}`);
        break;
      }

      case "subscription_cancelled": {
        await supabase.from("pro_subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("ls_subscription_id", lsSubscriptionId);
        // User keeps PRO until expiry date
        console.log(`[ls-webhook] Cancelled sub ${lsSubscriptionId} (active until expiry)`);
        break;
      }

      case "subscription_expired": {
        await supabase.from("pro_subscriptions")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("ls_subscription_id", lsSubscriptionId);

        // Check for other active subscriptions
        const { data: otherActive } = await supabase
          .from("pro_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .in("status", ["trial", "active"])
          .gt("expires_at", new Date().toISOString())
          .neq("ls_subscription_id", lsSubscriptionId)
          .limit(1);

        if (!otherActive || otherActive.length === 0) {
          await supabase.from("profiles").update({
            is_pro: false,
            pro_expires_at: null,
          }).eq("id", userId);
        }

        console.log(`[ls-webhook] Expired sub ${lsSubscriptionId}`);
        break;
      }

      case "subscription_payment_failed": {
        // Notify user about payment failure
        try {
          const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", userId).single();
          const { data: auth } = await supabase.auth.admin.getUserById(userId);
          if (auth?.user?.email) {
            await fetch(`${SUPABASE_URL}/functions/v1/send-pro-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({
                type: "trial_expiring_1d",
                user_id: userId,
                email: auth.user.email,
                nickname: profile?.nickname || "",
              }),
            });
          }
        } catch (e) { console.error("[ls-webhook] Email error:", e); }
        console.log(`[ls-webhook] Payment failed for ${lsSubscriptionId}`);
        break;
      }

      default:
        console.log(`[ls-webhook] Unhandled event: ${eventName}`);
    }

    return new Response(JSON.stringify({ ok: true, event: eventName }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ls-webhook] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
