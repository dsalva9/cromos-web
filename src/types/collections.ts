export interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
  description: string;
  is_active: boolean;
}

export interface UserCollection extends Collection {
  is_user_active: boolean;
  joined_at: string;
  stats?: {
    total_stickers: number;
    owned_stickers: number;
    completion_percentage: number;
    duplicates: number;
    missing: number;
  };
}

export interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserCollectionRawData {
  is_active: boolean;
  joined_at: string;
  collections: Collection[] | Collection | null;
}



