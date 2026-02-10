/**
 * Type augmentation for legacy v1.5.0 tables that still exist in the database
 * but were removed from the generated Supabase types in v1.6.0.
 *
 * These tables are still queried by the album and admin features.
 * When the full migration to template_* tables is complete, this file
 * can be deleted.
 *
 * @deprecated Prefer using v1.6.0 template_* tables for new code.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/* ─── Row types for legacy tables ─── */

export interface LegacyCollectionRow {
    id: number;
    name: string;
    description?: string | null;
    image_url?: string | null;
    created_at?: string | null;
}

export interface LegacyUserCollectionRow {
    id?: number;
    user_id: string;
    collection_id: number;
    is_active: boolean;
    created_at?: string | null;
}

export interface LegacyCollectionPageRow {
    id: number;
    collection_id: number;
    kind: 'team' | 'special';
    team_id: number | null;
    title: string;
    order_index: number;
    icon_url?: string | null;
}

export interface LegacyPageSlotRow {
    id?: number;
    page_id: number;
    slot_index: number;
    sticker_id: number | null;
}

export interface LegacyStickerRow {
    id: number;
    name: string;
    number?: string | null;
    image_url?: string | null;
    image_path_webp_300?: string | null;
    thumb_path_webp_100?: string | null;
    collection_id?: number | null;
    team_id?: number | null;
    is_special?: boolean;
}

export interface LegacyUserStickerRow {
    user_id: string;
    sticker_id: number;
    count: number;
}

export interface LegacyCollectionTeamRow {
    id: number;
    collection_id: number;
    team_name: string;
    logo_url: string | null;
}

/* ─── Helper to create a typed query on a legacy table ─── */

/**
 * Type-safe shortcut for querying legacy tables that aren't in the
 * generated `database.ts` types.
 *
 * Usage:
 *   legacyFrom(supabase, 'user_collections').select('*').eq(...)
 *
 * The return type is `any` from Supabase's perspective, but callers
 * should cast the result to the appropriate Legacy*Row type.
 */
export function legacyFrom(
    supabase: SupabaseClient,
    table:
        | 'collections'
        | 'user_collections'
        | 'collection_pages'
        | 'page_slots'
        | 'stickers'
        | 'user_stickers'
        | 'collection_teams'
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (supabase as any).from(table);
}

/**
 * Type-safe shortcut for calling legacy RPCs not in the generated types.
 */
export function legacyRpc(
    supabase: SupabaseClient,
    fn: string,
    params?: Record<string, unknown>
) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (supabase as any).rpc(fn, params);
}
