// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      collections: {
        Row: {
          id: number;
          name: string;
          competition: string;
          year: string;
          description: string | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          competition: string;
          year: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          competition?: string;
          year?: string;
          description?: string | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      collection_teams: {
        Row: {
          id: number;
          collection_id: number | null;
          team_name: string;
          team_code: string | null;
          logo_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          collection_id?: number | null;
          team_name: string;
          team_code?: string | null;
          logo_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          collection_id?: number | null;
          team_name?: string;
          team_code?: string | null;
          logo_url?: string | null;
          created_at?: string | null;
        };
      };
      stickers: {
        Row: {
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
        };
        Insert: {
          id?: number;
          collection_id?: number | null;
          team_id?: number | null;
          code: string;
          player_name: string;
          position?: string | null;
          nationality?: string | null;
          rating?: number | null;
          rarity?: string | null;
          image_url?: string | null;
          sticker_number?: number | null;
          image_path_webp_300?: string | null;
          thumb_path_webp_100?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          collection_id?: number | null;
          team_id?: number | null;
          code?: string;
          player_name?: string;
          position?: string | null;
          nationality?: string | null;
          rating?: number | null;
          rarity?: string | null;
          image_url?: string | null;
          sticker_number?: number | null;
          image_path_webp_300?: string | null;
          thumb_path_webp_100?: string | null;
          created_at?: string | null;
        };
      };
      user_collections: {
        Row: {
          user_id: string;
          collection_id: number;
          is_active: boolean | null;
          joined_at: string | null;
        };
        Insert: {
          user_id: string;
          collection_id: number;
          is_active?: boolean | null;
          joined_at?: string | null;
        };
        Update: {
          user_id?: string;
          collection_id?: number;
          is_active?: boolean | null;
          joined_at?: string | null;
        };
      };
      user_stickers: {
        Row: {
          user_id: string;
          sticker_id: number;
          count: number;
          wanted: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          sticker_id: number;
          count: number;
          wanted?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          sticker_id?: number;
          count?: number;
          wanted?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_collection_stats: {
        Args: {
          p_user_id: string;
          p_collection_id: number;
        };
        Returns: {
          total_stickers: number;
          owned_stickers: number;
          completion_percentage: number;
          duplicates: number;
          missing: number;
          wanted: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Application types
export type Collection = Database['public']['Tables']['collections']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Sticker = Database['public']['Tables']['stickers']['Row'];
export type UserCollection =
  Database['public']['Tables']['user_collections']['Row'];
export type UserSticker = Database['public']['Tables']['user_stickers']['Row'];

export interface CollectionWithStats extends Collection {
  stats?: {
    total_stickers: number;
    owned_stickers: number;
    completion_percentage: number;
    duplicates: number;
    wanted: number;
  };
}

export interface StickerWithOwnership extends Sticker {
  count: number;
  wanted: boolean;
  team_name?: string;
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
  status: TradeProposalStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeProposalListItem extends TradeProposal {
  offer_item_count: number;
  request_item_count: number;
}

export interface TradeProposalItem extends StickerWithOwnership {
  // This is used for the composer
  sticker_id: number;
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

