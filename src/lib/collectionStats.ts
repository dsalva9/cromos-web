import type { Database } from '@/types';

export interface NormalizedCollectionStats {
  total_stickers: number;
  owned_stickers: number;
  completion_percentage: number;
  duplicates: number;
  missing: number;
}

type RawCollectionStats =
  Database['public']['Functions']['get_user_collection_stats']['Returns'];

export function normalizeCollectionStats(
  raw: RawCollectionStats | null | undefined
): NormalizedCollectionStats | null {
  if (!raw) {
    return null;
  }

  const stats = Array.isArray(raw) ? raw[0] : raw;

  if (!stats || typeof stats !== 'object') {
    return null;
  }

  const total = Number((stats as Record<string, unknown>).total_stickers ?? 0);
  const owned = Number((stats as Record<string, unknown>).owned_stickers ?? 0);
  const duplicates = Number(
    (stats as Record<string, unknown>).duplicates ?? 0
  );
  const missingValue = (stats as Record<string, unknown>).missing;
  const missing =
    missingValue !== undefined && missingValue !== null
      ? Number(missingValue)
      : Math.max(total - owned, 0);
  const completionRaw = (stats as Record<string, unknown>)
    .completion_percentage;
  const completion =
    completionRaw !== undefined && completionRaw !== null
      ? Number(completionRaw)
      : total > 0
        ? Math.round((owned / total) * 100)
        : 0;

  return {
    total_stickers: Number.isFinite(total) ? total : 0,
    owned_stickers: Number.isFinite(owned) ? owned : 0,
    completion_percentage: Number.isFinite(completion) ? completion : 0,
    duplicates: Number.isFinite(duplicates) ? duplicates : 0,
    missing: Number.isFinite(missing) ? missing : 0,
  };
}
