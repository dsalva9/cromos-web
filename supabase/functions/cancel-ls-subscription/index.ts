// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LS_API_KEY = Deno.env.get("LS_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cancel a LemonSqueezy subscription.
 * Requires authenticated user. Verifies ownership before cancelling.
 * 
 * POST body: { ls_subscription_id: string }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: get the calling user
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify JWT to get user ID
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ls_subscription_id } = await req.json();

    if (!ls_subscription_id) {
      return new Response(JSON.stringify({ error: "ls_subscription_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the subscription belongs to this user
    const { data: sub, error: subError } = await supabase
      .from("pro_subscriptions")
      .select("id, user_id, status")
      .eq("ls_subscription_id", ls_subscription_id)
      .maybeSingle();

    if (subError || !sub) {
      return new Response(JSON.stringify({ error: "Suscripción no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sub.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "No tienes permiso para cancelar esta suscripción" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sub.status === "cancelled" || sub.status === "expired") {
      return new Response(JSON.stringify({ ok: true, message: "La suscripción ya está cancelada" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LS_API_KEY) {
      console.error("[cancel-ls] LS_API_KEY not configured");
      return new Response(JSON.stringify({ error: "LemonSqueezy API key no configurada. Contacta con soporte." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call LemonSqueezy API to cancel the subscription
    // DELETE /v1/subscriptions/{id} cancels (does not delete) the subscription
    const lsResponse = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${ls_subscription_id}`,
      {
        method: "DELETE",
        headers: {
          "Accept": "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          "Authorization": `Bearer ${LS_API_KEY}`,
        },
      }
    );

    if (lsResponse.ok || lsResponse.status === 204) {
      // Update local DB
      await supabase
        .from("pro_subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("ls_subscription_id", ls_subscription_id);

      // Send cancellation email (non-blocking)
      try {
        const { data: subDetails } = await supabase
          .from("pro_subscriptions")
          .select("expires_at, plan")
          .eq("ls_subscription_id", ls_subscription_id)
          .maybeSingle();
        const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", user.id).single();

        await fetch(`${SUPABASE_URL}/functions/v1/send-pro-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({
            type: "subscription_cancelled",
            user_id: user.id,
            email: user.email,
            nickname: profile?.nickname || "",
            plan: subDetails?.plan,
            expires_at: subDetails?.expires_at,
          }),
        });
      } catch (emailErr) {
        console.error("[cancel-ls] Email error (non-fatal):", emailErr);
      }

      console.log(`[cancel-ls] Cancelled LS subscription ${ls_subscription_id} for user ${user.id}`);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const errorBody = await lsResponse.text();
      console.error(`[cancel-ls] LS API error ${lsResponse.status}:`, errorBody);
      return new Response(JSON.stringify({ error: "Error al cancelar en LemonSqueezy. Contacta con soporte." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("[cancel-ls] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
