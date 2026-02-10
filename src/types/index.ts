// Re-export auto-generated database types
export type { Database, Json } from './database';

// ──────────────────────────────────────────────────────────────
// Application-level types
// ──────────────────────────────────────────────────────────────

/** Legacy collection shape (v1.5.0) with optional stats — used by album views */
export interface CollectionWithStats {
  id: number;
  name: string;
  competition: string;
  year: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  stats?: {
    total_stickers: number;
    owned_stickers: number;
    completion_percentage: number;
    duplicates: number;
    missing: number;
  };
}

/** Sticker with ownership count — used by album page views */
export interface StickerWithOwnership {
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

/** User's sticker with detail info — used by trade components */
export interface UserStickerWithDetails {
  user_id: string;
  sticker_id: number;
  count: number;
  created_at: string | null;
  updated_at: string | null;
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
