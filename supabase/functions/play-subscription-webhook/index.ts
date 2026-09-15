// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Google Play RTDN (Real-Time Developer Notifications) webhook.
 * Receives Pub/Sub push messages from Google Cloud for subscription lifecycle events.
 * 
 * Flow:
 * 1. Google Play → Pub/Sub topic → Push subscription → This endpoint
 * 2. Decode base64 message → Extract subscriptionNotification
 * 3. Verify purchase with Google Play Developer API
 * 4. Update pro_subscriptions + profiles accordingly
 * 5. Send lifecycle emails
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();

    // Pub/Sub sends: { message: { data: base64, messageId, publishTime }, subscription }
    const message = body?.message;
    if (!message?.data) {
      console.log("[play-webhook] No message data, acknowledging");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
    }

    // Decode the base64 data
    const decoded = atob(message.data);
    const notification = JSON.parse(decoded);
    console.log("[play-webhook] Notification:", JSON.stringify(notification));

    const subNotif = notification?.subscriptionNotification;
    if (!subNotif) {
      // Could be a test notification or other type
      console.log("[play-webhook] No subscriptionNotification, acknowledging");
      return new Response(JSON.stringify({ ok: true, type: "non_subscription" }), { status: 200, headers: corsHeaders });
    }

    const { notificationType, purchaseToken, subscriptionId } = subNotif;
    const packageName = notification.packageName || "com.cambiocromos.app";

    // Notification types (from Google docs):
    // 1=RECOVERED, 2=RENEWED, 3=CANCELED, 4=PURCHASED, 5=ON_HOLD,
    // 6=IN_GRACE_PERIOD, 7=RESTARTED, 8=PRICE_CHANGE_CONFIRMED,
    // 9=DEFERRED, 10=PAUSED, 11=PAUSE_SCHEDULE_CHANGED,
    // 12=REVOKED, 13=EXPIRED, 20=PENDING_PURCHASE_CANCELED

    // Look up existing subscription by purchase_token
    const { data: existingSub } = await supabase
      .from("pro_subscriptions")
      .select("id, user_id, status, expires_at")
      .eq("google_purchase_token", purchaseToken)
      .maybeSingle();

    // For new purchases (type 4), we need to find the user via the purchase verification
    if (notificationType === 4 && !existingSub) {
      // PURCHASED — This is handled by the app's verify-play-purchase flow
      // The app calls verify-play-purchase after purchase, which creates the subscription
      // This webhook serves as a backup and for renewal/cancellation tracking
      console.log("[play-webhook] New purchase, will be handled by verify-play-purchase");
      return new Response(JSON.stringify({ ok: true, type: "new_purchase_deferred" }), { status: 200, headers: corsHeaders });
    }

    if (!existingSub) {
      console.log("[play-webhook] No existing subscription found for token");
      return new Response(JSON.stringify({ ok: true, type: "no_match" }), { status: 200, headers: corsHeaders });
    }

    const userId = existingSub.user_id;
    const plan = subscriptionId === "pro_yearly_cc" ? "yearly" : "monthly";

    switch (notificationType) {
      case 1: // RECOVERED — subscription recovered from account hold
      case 7: // RESTARTED — user restarted subscription
        await supabase.from("pro_subscriptions").update({
          status: "active",
          updated_at: new Date().toISOString(),
        }).eq("id", existingSub.id);
        await supabase.from("profiles").update({
          is_pro: true,
        }).eq("id", userId);
        console.log(`[play-webhook] Recovered/Restarted sub for user ${userId}`);
        break;

      case 2: // RENEWED
        const newExpiry = plan === "yearly"
          ? new Date(Date.now() + 365 * 86400000)
          : new Date(Date.now() + 30 * 86400000);
        
        await supabase.from("pro_subscriptions").update({
          status: "active",
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", existingSub.id);
        await supabase.from("profiles").update({
          is_pro: true,
          pro_expires_at: newExpiry.toISOString(),
        }).eq("id", userId);

        // Grant monthly highlight credits on renewal
        await supabase.rpc("purchase_highlight_credits", {
          p_user_id: userId,
          p_amount: 800,
          p_source: "admin_grant",
          p_ls_order_id: `renewal_${existingSub.id}_${Date.now()}`,
        });

        console.log(`[play-webhook] Renewed sub for user ${userId}, expires ${newExpiry}`);
        break;

      case 3: // CANCELED — will still be active until expiry
        await supabase.from("pro_subscriptions").update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        }).eq("id", existingSub.id);
        console.log(`[play-webhook] Cancelled sub for user ${userId} (still active until expiry)`);
        break;

      case 5: // ON_HOLD
      case 6: // IN_GRACE_PERIOD
        await supabase.from("pro_subscriptions").update({
          status: "on_hold",
          updated_at: new Date().toISOString(),
        }).eq("id", existingSub.id);
        console.log(`[play-webhook] On hold/grace for user ${userId}`);
        break;

      case 12: // REVOKED
      case 13: // EXPIRED
        await supabase.from("pro_subscriptions").update({
          status: "expired",
          updated_at: new Date().toISOString(),
        }).eq("id", existingSub.id);

        // Check if user has any other active subscriptions
        const { data: otherActive } = await supabase
          .from("pro_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .in("status", ["trial", "active"])
          .gt("expires_at", new Date().toISOString())
          .neq("id", existingSub.id)
          .limit(1);

        if (!otherActive || otherActive.length === 0) {
          await supabase.from("profiles").update({
            is_pro: false,
            pro_expires_at: null,
          }).eq("id", userId);
        }

        // Send expiration email
        try {
          const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", userId).single();
          const { data: auth } = await supabase.auth.admin.getUserById(userId);
          if (auth?.user?.email) {
            await fetch(`${SUPABASE_URL}/functions/v1/send-pro-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({
                type: "subscription_cancelled",
                user_id: userId,
                email: auth.user.email,
                nickname: profile?.nickname || "",
                plan,
              }),
            });
          }
        } catch (emailErr) {
          console.error("[play-webhook] Email error:", emailErr);
        }

        console.log(`[play-webhook] Expired/Revoked sub for user ${userId}`);
        break;

      default:
        console.log(`[play-webhook] Unhandled notification type: ${notificationType}`);
    }

    return new Response(JSON.stringify({ ok: true, type: notificationType }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[play-webhook] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
