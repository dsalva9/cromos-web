// Database types matching Supabase v1.6.0 schema

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  postcode: string | null;
  rating_avg: number;
  rating_count: number;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  author_nickname: string;
  author_avatar_url: string | null;
  author_postcode?: string | null;
  title: string;
  description: string | null;
  sticker_number: string | null;
  collection_name: string | null;
  image_url: string | null;
  status: 'active' | 'reserved' | 'completed' | 'sold' | 'removed';
  views_count: number;
  created_at: string;
  copy_id?: string | null;
  slot_id?: string | null;
  distance_km?: number | null;
}

export interface Template {
  id: string;
  author_id: string;
  author_nickname: string;
  title: string;
  description: string | null;
  image_url: string | null;
  is_public: boolean;
  rating_avg: number;
  rating_count: number;
  copies_count: number;
  pages_count: number;
  created_at: string;
}

export interface TemplateCopy {
  copy_id: string;
  template_id: string;
  title: string;
  is_active: boolean;
  copied_at: string;
  original_author_nickname: string;
  completed_slots: number;
  total_slots: number;
}

export interface SlotProgress {
  slot_id: string;
  page_id: string;
  page_number: number;
  page_title: string;
  slot_number: number;
  slot_variant: string | null;
  global_number: number | null;
  label: string | null;
  is_special: boolean;
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
}

export interface UserProfile extends Profile {
  favorites_count: number;
}

export interface Favorite {
  favorite_user_id: string;
  nickname: string;
  avatar_url: string | null;
  active_listings_count: number;
  rating_avg: number;
  created_at: string;
}

// Common utility types
export type SortOption = 'recent' | 'rating' | 'popular';
export type ListingStatus = 'active' | 'sold' | 'removed';
export type SlotStatus = 'missing' | 'owned' | 'duplicate';
export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'scam'
  | 'harassment'
  | 'fake'
  | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

// API response types
export interface ApiError {
  message: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
}

// Form types
export interface CreateListingForm {
  title: string;
  description: string;
  sticker_number: string;
  collection_name: string;
  image_url?: string;
  copy_id?: number;
  slot_id?: number;
  // Panini-style fields
  page_number?: number;
  page_title?: string;
  slot_variant?: string;
  global_number?: number;
}

export interface CreateTemplateForm {
  title: string;
  description: string;
  image_url?: string;
  is_public: boolean;
}

export interface ReportForm {
  reason: ReportReason;
  description: string;
}

export interface RatingForm {
  rating: number;
  comment: string;
}
