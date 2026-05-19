import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: sync-resend-contact
 * Lightweight single-contact sync to Resend.
 * Called by database triggers (fire-and-forget) when users confirm email or are soft-deleted.
 * Also callable manually for individual contact operations.
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_SEGMENT_ID = Deno.env.get('RESEND_SEGMENT_ID'); // "CambioCromos Users" segment

interface SyncPayload {
  action: 'create' | 'unsubscribe';
  email: string;
  user_id: string;
  nickname?: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      console.error('[sync-resend-contact] Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Resend not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload: SyncPayload = await req.json();
    const { action, email, user_id, nickname } = payload;

    if (!action || !email || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, email, user_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-resend-contact] ${action}: ${email} (${user_id})`);

    if (action === 'create') {
      // Create contact in Resend (upserts by email)
      const contactPayload: Record<string, unknown> = {
        email,
        firstName: nickname || '',
        unsubscribed: false,
      };

      // Add to segment if configured
      if (RESEND_SEGMENT_ID) {
        contactPayload.segments = [{ id: RESEND_SEGMENT_ID }];
      }

      const response = await fetch('https://api.resend.com/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(contactPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[sync-resend-contact] Create failed:', result);
        return new Response(
          JSON.stringify({ error: 'Failed to create contact', details: result }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[sync-resend-contact] Created: ${email}`, result);
      return new Response(
        JSON.stringify({ success: true, action: 'created', result }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } else if (action === 'unsubscribe') {
      // First, find the contact by email
      const searchResponse = await fetch(
        `https://api.resend.com/contacts?email=${encodeURIComponent(email)}`,
        {
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}` },
        }
      );

      if (!searchResponse.ok) {
        console.error('[sync-resend-contact] Search failed for:', email);
        return new Response(
          JSON.stringify({ error: 'Failed to find contact' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const searchResult = await searchResponse.json();
      const contacts = searchResult.data || [];

      if (contacts.length === 0) {
        console.log(`[sync-resend-contact] Contact not found in Resend: ${email}`);
        return new Response(
          JSON.stringify({ success: true, action: 'not_found', message: 'Contact not in Resend' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Mark as unsubscribed
      const contactId = contacts[0].id;
      const updateResponse = await fetch(`https://api.resend.com/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({ unsubscribed: true }),
      });

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        console.error('[sync-resend-contact] Unsubscribe failed:', updateResult);
        return new Response(
          JSON.stringify({ error: 'Failed to unsubscribe contact', details: updateResult }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[sync-resend-contact] Unsubscribed: ${email}`);
      return new Response(
        JSON.stringify({ success: true, action: 'unsubscribed', result: updateResult }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Must be "create" or "unsubscribe"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-resend-contact] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
