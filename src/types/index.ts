// Re-export auto-generated database types
export type { Database, Json } from './database';

// ──────────────────────────────────────────────────────────────
// Legacy table types (v1.5.0)
// These tables were removed in v1.6.0 (collections → templates pivot)
// but the types are still referenced by dead code paths.
// TODO: Remove when dead code is cleaned up (see code_review.md #4)
// ──────────────────────────────────────────────────────────────

/** @deprecated Removed in v1.6.0 — use collection_templates instead */
export interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

/** @deprecated Removed in v1.6.0 */
export interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** @deprecated Removed in v1.6.0 */
export interface Sticker {
  id: number;
  collection_id: number | null;
  team_id: number | null;
  code: string;
  player_name: string;
  position: string | null;
  nationality: string | null;
  rating: number | null;
  rarity: string | null;
  image_url: string | null;
  sticker_number: number | null;
  image_path_webp_300: string | null;
  thumb_path_webp_100: string | null;
  created_at: string | null;
}

/** @deprecated Removed in v1.6.0 */
export interface UserCollection {
  user_id: string;
  collection_id: number;
  is_active: boolean | null;
  joined_at: string | null;
}

/** @deprecated Removed in v1.6.0 */
export interface UserSticker {
  user_id: string;
  sticker_id: number;
  count: number;
  created_at: string | null;
  updated_at: string | null;
}

// ──────────────────────────────────────────────────────────────
// Application-level types (still in use)
// ──────────────────────────────────────────────────────────────

export interface CollectionWithStats extends Collection {
  stats?: {
    total_stickers: number;
    owned_stickers: number;
    completion_percentage: number;
    duplicates: number;
    missing: number;
  };
}

export interface StickerWithOwnership extends Sticker {
  count: number;
  team_name?: string;
}

export interface StickerDetailsLite {
  code: string;
  player_name: string;
  thumb_path_webp_100: string | null;
  thumb_public_url?: string; // Computed field
  image_public_url?: string; // Computed field (fallback)
  collection_teams: { team_name: string } | null;
}

export interface UserStickerWithDetails extends UserSticker {
  stickers: StickerDetailsLite | null;
  duplicates?: number;
}

export type StickerRarity = 'common' | 'rare' | 'epic' | 'legendary';

// Trade Proposal types

export enum TradeProposalStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum TradeProposalItemDirection {
  OFFER = 'offer',
  REQUEST = 'request',
}

export interface TradeProposal {
  id: number;
  collection_id: number;
  from_user_id: string;
  from_user_nickname: string;
  to_user_id: string;
  to_user_nickname: string;
  status: string;  // DB returns string; use TradeProposalStatus values for comparison
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeProposalListItem extends TradeProposal {
  offer_item_count: number;
  request_item_count: number;
}

export interface TradeProposalItem extends UserStickerWithDetails {
  // Used for the proposal composer selections
  direction: TradeProposalItemDirection;
  quantity: number;
}

export interface TradeProposalDetailItem {
  // This is for the detail view RPC
  id: number;
  sticker_id: number;
  direction: TradeProposalItemDirection;
  quantity: number;
  sticker_code: string;
  player_name: string;
  team_name: string;
  rarity: string;
}

export interface TradeProposalDetail {
  proposal: TradeProposal;
  items: TradeProposalDetailItem[];
}
