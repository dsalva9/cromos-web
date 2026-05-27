import "jsr:@supabase/functions-js/edge-runtime.d.ts";
/**
 * Supabase Edge Function: sync-resend-contacts
 * Bulk seed of users to Resend contacts.
 * Supports syncing all active users or admins-only for testing.
 * Admin-only, called from the admin dashboard.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_SEGMENT_ID = Deno.env.get('RESEND_SEGMENT_ID');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SyncPayload {
  admins_only?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      console.error('[sync-resend-contacts] Resend API key not configured');
      return new Response(
        JSON.stringify({ error: 'Resend not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse payload
    const payload: SyncPayload = await req.json().catch(() => ({}));
    const adminsOnly = payload.admins_only ?? false;

    console.log(`[sync-resend-contacts] Starting bulk sync (admins_only: ${adminsOnly})`);

    // Query users to sync using the newsletter_eligible_profiles view
    let query = supabase
      .from('newsletter_eligible_profiles')
      .select('id, nickname, email, is_admin');

    if (adminsOnly) {
      query = query.eq('is_admin', true);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('[sync-resend-contacts] Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profiles', details: profilesError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ created: 0, skipped: 0, errors: 0, message: 'No profiles found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-resend-contacts] Found ${profiles.length} profiles to sync`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const p of profiles) {
      const contactPayload: Record<string, unknown> = {
        email: p.email,
        firstName: p.nickname || '',
        unsubscribed: false,
      };

      if (RESEND_SEGMENT_ID) {
        contactPayload.segments = [{ id: RESEND_SEGMENT_ID }];
      }

      try {
        const response = await fetch('https://api.resend.com/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(contactPayload),
        });

        if (response.ok) {
          created++;
          console.log(`[sync-resend-contacts] ✓ Synced: ${p.nickname} (${p.email})`);
        } else {
          const err = await response.json();
          // "contact_already_exists" is fine — it's an upsert
          if (err?.name === 'contact_already_exists' || err?.message?.includes('already exists')) {
            skipped++;
            console.log(`[sync-resend-contacts] ~ Already exists: ${p.nickname}`);
          } else {
            errors++;
            console.error(`[sync-resend-contacts] ✗ Failed: ${p.nickname}`, err);
          }
        }
      } catch (err) {
        errors++;
        console.error(`[sync-resend-contacts] ✗ Error: ${p.nickname}`, err);
      }

      // Rate limiting: 100ms delay (10 req/sec Resend limit for Contacts API)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = { created, skipped, errors, total: profiles.length };
    console.log('[sync-resend-contacts] Complete:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-resend-contacts] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
