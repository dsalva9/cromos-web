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
 * Daily cron job to process PRO subscription expirations.
 *
 * 1. Trials/subs expiring in 7 days → send reminder email
 * 2. Trials/subs expiring in 1 day → send urgent email
 * 3. Expired trials/subs → mark expired, update profile, send email
 *
 * Called via pg_cron + pg_net.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const results = { expiring_7d: 0, expiring_1d: 0, expired: 0, errors: [] as string[] };

  try {
    // Helper to send pro email
    async function sendProEmail(
      userId: string, email: string, nickname: string,
      type: string, expiresAt: string, plan?: string, trialDays?: number
    ) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-pro-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type,
            user_id: userId,
            email,
            nickname,
            expires_at: expiresAt,
            plan,
            trial_days: trialDays,
          }),
        });
      } catch (err) {
        results.errors.push(`Email failed for ${userId}: ${err}`);
      }
    }

    // 1. Expiring in 7 days (between 6 and 7 days from now to avoid duplicates)
    const { data: expiring7d } = await supabase
      .from("pro_subscriptions")
      .select("id, user_id, status, plan, expires_at")
      .in("status", ["trial", "active"])
      .gte("expires_at", new Date(Date.now() + 6 * 86400000).toISOString())
      .lte("expires_at", new Date(Date.now() + 7 * 86400000).toISOString());

    for (const sub of expiring7d || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", sub.user_id)
        .single();
      const { data: auth } = await supabase.auth.admin.getUserById(sub.user_id);
      const email = auth?.user?.email;
      if (email) {
        await sendProEmail(
          sub.user_id, email, profile?.nickname || "",
          "trial_expiring_7d", sub.expires_at
        );
        results.expiring_7d++;
      }
    }

    // 2. Expiring in 1 day (between 0 and 1 day from now)
    const { data: expiring1d } = await supabase
      .from("pro_subscriptions")
      .select("id, user_id, status, plan, expires_at")
      .in("status", ["trial", "active"])
      .gte("expires_at", new Date().toISOString())
      .lte("expires_at", new Date(Date.now() + 86400000).toISOString());

    for (const sub of expiring1d || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", sub.user_id)
        .single();
      const { data: auth } = await supabase.auth.admin.getUserById(sub.user_id);
      const email = auth?.user?.email;
      if (email) {
        await sendProEmail(
          sub.user_id, email, profile?.nickname || "",
          "trial_expiring_1d", sub.expires_at
        );
        results.expiring_1d++;
      }
    }

    // 3. Already expired — mark as expired and notify
    const { data: expired } = await supabase
      .from("pro_subscriptions")
      .select("id, user_id, status, plan, expires_at")
      .in("status", ["trial", "active"])
      .lt("expires_at", new Date().toISOString());

    for (const sub of expired || []) {
      // Update subscription status
      await supabase
        .from("pro_subscriptions")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", sub.id);

      // Update profile cache
      // Check if user has any OTHER active subscription
      const { data: otherActive } = await supabase
        .from("pro_subscriptions")
        .select("id")
        .eq("user_id", sub.user_id)
        .in("status", ["trial", "active"])
        .gt("expires_at", new Date().toISOString())
        .neq("id", sub.id)
        .limit(1);

      if (!otherActive || otherActive.length === 0) {
        await supabase
          .from("profiles")
          .update({ is_pro: false, pro_expires_at: null })
          .eq("id", sub.user_id);
      }

      // Send email
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", sub.user_id)
        .single();
      const { data: auth } = await supabase.auth.admin.getUserById(sub.user_id);
      const email = auth?.user?.email;
      if (email) {
        const emailType = sub.status === "trial" ? "trial_expired" : "subscription_cancelled";
        await sendProEmail(
          sub.user_id, email, profile?.nickname || "",
          emailType, sub.expires_at, sub.plan
        );
        results.expired++;
      }
    }

    console.log("[process-pro-expiration] Results:", JSON.stringify(results));

    return new Response(
      JSON.stringify({ ok: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[process-pro-expiration] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
