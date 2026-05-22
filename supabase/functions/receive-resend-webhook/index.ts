import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: receive-resend-webhook
 *
 * Receives webhook events from Resend (email provider). Currently only
 * processes `email.bounced` events — when a bounce is detected the
 * recipient address is upserted into the `email_bounces` table.
 *
 * After 2 cumulative bounces the address is automatically suppressed so
 * future Edge Functions can skip sending to it.
 *
 * **Security note:** This endpoint does NOT require JWT verification.
 * Resend webhooks are server-to-server calls that do not carry a
 * Supabase auth token. The function is safe because it only _writes_
 * bounce metadata — it never exposes user data.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of the webhook payload sent by Resend. */
interface ResendWebhookEvent {
  type: string; // e.g. 'email.bounced', 'email.delivered', etc.
  data: {
    email_id: string;
    to: string[]; // recipient email addresses
    from: string;
    subject: string;
    created_at: string;
  };
}

// ---------------------------------------------------------------------------
// CORS headers (consistent with other project Edge Functions)
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the incoming webhook event
    const event: ResendWebhookEvent = await req.json();

    console.log("[receive-resend-webhook] Received event:", {
      type: event.type,
      email_id: event.data?.email_id,
      to: event.data?.to,
    });

    // We only care about bounce events — acknowledge everything else with 200.
    if (event.type !== "email.bounced") {
      console.log(
        `[receive-resend-webhook] Ignoring non-bounce event: ${event.type}`
      );
      return new Response(
        JSON.stringify({ message: `Event ${event.type} acknowledged` }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // -----------------------------------------------------------------------
    // Process bounce: upsert each recipient into email_bounces
    // -----------------------------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const recipients = event.data?.to ?? [];

    for (const recipientEmail of recipients) {
      const email = recipientEmail.toLowerCase().trim();

      console.log(
        `[receive-resend-webhook] Processing bounce for: ${email}`
      );

      // Check if a record already exists for this email
      const { data: existing, error: selectError } = await supabase
        .from("email_bounces")
        .select("id, bounce_count")
        .eq("email", email)
        .maybeSingle();

      if (selectError) {
        console.error(
          `[receive-resend-webhook] Error selecting bounce record for ${email}:`,
          selectError
        );
        continue; // best-effort — don't fail the whole webhook
      }

      if (existing) {
        // Update existing record: increment bounce_count and conditionally suppress
        const newCount = existing.bounce_count + 1;
        const shouldSuppress = newCount >= 2;

        const { error: updateError } = await supabase
          .from("email_bounces")
          .update({
            bounce_count: newCount,
            last_bounced_at: new Date().toISOString(),
            suppressed: shouldSuppress,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error(
            `[receive-resend-webhook] Error updating bounce record for ${email}:`,
            updateError
          );
        } else {
          console.log(
            `[receive-resend-webhook] Updated bounce for ${email}: count=${newCount}, suppressed=${shouldSuppress}`
          );
        }
      } else {
        // Insert new record (first bounce — not yet suppressed)
        const { error: insertError } = await supabase
          .from("email_bounces")
          .insert({
            email,
            bounce_count: 1,
            last_bounced_at: new Date().toISOString(),
            suppressed: false,
          });

        if (insertError) {
          console.error(
            `[receive-resend-webhook] Error inserting bounce record for ${email}:`,
            insertError
          );
        } else {
          console.log(
            `[receive-resend-webhook] Recorded first bounce for ${email}`
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: recipients.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[receive-resend-webhook] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
