import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Webhook } from "npm:svix@1.40.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");

interface ResendInboundEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  date: string;
  headers?: Record<string, string>;
}

interface WebhookPayload {
  type: string;
  data: ResendInboundEmail;
}

Deno.serve(async (req: Request) => {
  try {
    // Verify webhook signature
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error("Missing svix headers");
      return new Response(JSON.stringify({ error: "Missing signature headers" }), {
        status: 200, // Return 200 to prevent retries
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const wh = new Webhook(webhookSecret!);

    let payload: WebhookPayload;
    try {
      payload = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookPayload;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 200, // Return 200 to prevent retries
        headers: { "Content-Type": "application/json" },
      });
    }

    const emailData = payload.data;
    console.log("Received inbound email:", {
      id: emailData.id,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch active forwarding addresses
    const { data: addresses, error: fetchError } = await supabase
      .from("email_forwarding_addresses")
      .select("email")
      .eq("is_active", true);

    if (fetchError) {
      console.error("Error fetching forwarding addresses:", fetchError);
      await logEmail(supabase, emailData, [], "failed", { error: fetchError.message });
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!addresses || addresses.length === 0) {
      console.log("No active forwarding addresses configured");
      await logEmail(supabase, emailData, [], "failed", { error: "No active forwarding addresses" });
      return new Response(JSON.stringify({ message: "No forwarding addresses" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const forwardingAddresses = addresses.map((a) => a.email);
    console.log(`Forwarding to ${forwardingAddresses.length} addresses`);

    // Forward email to each address sequentially with delay to respect rate limits
    // Resend allows 2 requests per second, so we add a 600ms delay between sends
    const forwardingResults: Array<{ toEmail: string; success: boolean; data?: any; error?: any }> = [];

    for (let i = 0; i < forwardingAddresses.length; i++) {
      const toEmail = forwardingAddresses[i];

      // Add delay between sends (except for the first one)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      try {
        const { data, error } = await resend.emails.send({
          from: "CambioCromos <info@cambiocromos.com>",
          to: toEmail,
          subject: `[Forwarded] ${emailData.subject || "(No Subject)"}`,
          html: generateForwardedEmailHtml(emailData),
        });

        if (error) {
          console.error(`Failed to forward to ${toEmail}:`, error);
          forwardingResults.push({ toEmail, success: false, error });
        } else {
          console.log(`Successfully forwarded to ${toEmail}`);
          forwardingResults.push({ toEmail, success: true, data });
        }
      } catch (err) {
        console.error(`Error forwarding to ${toEmail}:`, err);
        forwardingResults.push({ toEmail, success: false, error: err });
      }
    }

    // Analyze results
    const successfulForwards = forwardingResults.filter((r) => r.success);
    const failedForwards = forwardingResults.filter((r) => !r.success);

    const forwardedTo = successfulForwards.map((r) => r.toEmail);

    let status: "success" | "partial_failure" | "failed";
    if (successfulForwards.length === forwardingAddresses.length) {
      status = "success";
    } else if (successfulForwards.length > 0) {
      status = "partial_failure";
    } else {
      status = "failed";
    }

    const errorDetails =
      failedForwards.length > 0
        ? {
            failed_addresses: failedForwards.map((r) => r.toEmail),
            errors: failedForwards.map((r) => r.error),
          }
        : null;

    // Log the forwarding attempt
    await logEmail(supabase, emailData, forwardedTo, status, errorDetails);

    return new Response(
      JSON.stringify({
        message: "Email processed",
        status,
        forwarded_to: forwardedTo.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error in webhook handler:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200, // Always return 200 to prevent retries
      headers: { "Content-Type": "application/json" },
    });
  }
});

function generateForwardedEmailHtml(emailData: ResendInboundEmail): string {
  const body = emailData.html || (emailData.text ? `<pre>${emailData.text}</pre>` : "<p>No content</p>");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .forward-header {
      background-color: #f5f5f5;
      border-left: 4px solid #FFC000;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .forward-header h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 16px;
    }
    .forward-info {
      font-size: 14px;
      color: #666;
      margin: 5px 0;
    }
    .forward-info strong {
      color: #333;
    }
    .email-content {
      border-top: 2px solid #e0e0e0;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="forward-header">
    <h3>Forwarded Message</h3>
    <div class="forward-info"><strong>From:</strong> ${emailData.from}</div>
    <div class="forward-info"><strong>To:</strong> ${emailData.to.join(", ")}</div>
    <div class="forward-info"><strong>Date:</strong> ${new Date(emailData.date).toLocaleString()}</div>
    <div class="forward-info"><strong>Subject:</strong> ${emailData.subject || "(No Subject)"}</div>
  </div>
  <div class="email-content">
    ${body}
  </div>
</body>
</html>
  `.trim();
}

async function logEmail(
  supabase: any,
  emailData: ResendInboundEmail,
  forwardedTo: string[],
  status: "success" | "partial_failure" | "failed",
  errorDetails: any = null
) {
  try {
    // Insert log entry directly into the table
    const { error: insertError } = await supabase
      .from("inbound_email_log")
      .insert({
        resend_email_id: emailData.id,
        from_address: emailData.from,
        to_addresses: emailData.to,
        subject: emailData.subject || "(No Subject)",
        forwarded_to: forwardedTo,
        forwarding_status: status,
        error_details: errorDetails,
      });

    if (insertError) {
      console.error("Failed to insert email log:", insertError);
      return;
    }

    // Update last_used_at for forwarded addresses
    if (forwardedTo && forwardedTo.length > 0) {
      const { error: updateError } = await supabase
        .from("email_forwarding_addresses")
        .update({ last_used_at: new Date().toISOString() })
        .in("email", forwardedTo);

      if (updateError) {
        console.error("Failed to update last_used_at:", updateError);
      }
    }
  } catch (err) {
    console.error("Exception logging email:", err);
  }
}
