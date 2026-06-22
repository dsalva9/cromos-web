/**
 * Supabase Client for Marketplace Alerts
 * CRUD operations and types for the alerts system.
 */

import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface MarketplaceAlert {
  id: number;
  search_query: string | null;
  collection_id: number | null;
  collection_name: string | null;
  template_id: number | null;
  template_name: string | null;
  slot_number: number | null;
  slot_variant: string | null;
  frequency: 'instant' | 'daily' | 'weekly';
  channel_email: boolean;
  channel_push: boolean;
  channel_in_app: boolean;
  is_active: boolean;
  last_triggered_at: string | null;
  last_digest_at: string | null;
  created_at: string;
  total_matches: number;
}

export interface CreateAlertParams {
  p_search_query?: string | null;
  p_collection_id?: number | null;
  p_template_id?: number | null;
  p_slot_number?: number | null;
  p_slot_variant?: string | null;
  p_frequency: 'instant' | 'daily' | 'weekly';
  p_channel_email: boolean;
  p_channel_push: boolean;
  p_channel_in_app: boolean;
}

export interface UpdateAlertParams extends CreateAlertParams {
  p_alert_id: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════════════════════════

/** Fetch all alerts for the current user */
export async function fetchUserAlerts(): Promise<MarketplaceAlert[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_user_alerts');
  if (error) throw error;
  return (data ?? []) as MarketplaceAlert[];
}

// Helper to convert null properties to undefined for RPC calls
function cleanParams<T extends Record<string, any>>(params: T) {
  return Object.fromEntries(
    Object.entries(params).map(([key, val]) => [key, val === null ? undefined : val])
  ) as any;
}

/** Create a new marketplace alert */
export async function createAlert(params: CreateAlertParams): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_marketplace_alert', cleanParams(params));
  if (error) throw error;
  return data as number;
}

/** Update an existing alert */
export async function updateAlert(params: UpdateAlertParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('update_marketplace_alert', cleanParams(params));
  if (error) throw error;
}

/** Delete an alert */
export async function deleteAlert(alertId: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('delete_marketplace_alert', { p_alert_id: alertId });
  if (error) throw error;
}

/** Toggle alert active/paused state */
export async function toggleAlert(alertId: number): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('toggle_marketplace_alert', { p_alert_id: alertId });
  if (error) throw error;
  return data as boolean;
}
