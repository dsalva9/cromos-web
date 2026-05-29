'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useFindTraders } from './useFindTraders';
import { useUserCollections } from '@/hooks/templates/useUserCollections';
import { useUser } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export interface TradeMatch {
  match_user_id: string;
  nickname: string | null;
  overlap_from_them_to_me: number;
  overlap_from_me_to_them: number;
  total_mutual_overlap: number;
  distance_km: number | null;
  postcode: string | null;
  score: number | null;
}

export type SwiperPhase = 'loading' | 'geo_prompt' | 'swiping' | 'expand' | 'exhausted';

interface SeenData {
  ids: string[];
  timestamp: number;
}

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------
const RADIUS_TIERS = [10, 25, 50, null] as const;
const SEEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_MIN_OVERLAP = 5;
const BATCH_SIZE = 50; // Fetch larger batches for swiping

// ------------------------------------------------------------------
// localStorage helpers
// ------------------------------------------------------------------
function getSeenKey(collectionId: number): string {
  return `matchfinder_seen_${collectionId}`;
}

function loadSeen(collectionId: number): Set<string> {
  try {
    const raw = localStorage.getItem(getSeenKey(collectionId));
    if (!raw) return new Set();
    const data: SeenData = JSON.parse(raw);
    // Expire after 24h
    if (Date.now() - data.timestamp > SEEN_EXPIRY_MS) {
      localStorage.removeItem(getSeenKey(collectionId));
      return new Set();
    }
    return new Set(data.ids);
  } catch {
    return new Set();
  }
}

function saveSeen(collectionId: number, ids: Set<string>): void {
  try {
    const data: SeenData = { ids: Array.from(ids), timestamp: Date.now() };
    localStorage.setItem(getSeenKey(collectionId), JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently continue
  }
}

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------
export interface MatchSwiperFilters {
  rarity: string;
  team: string;
  query: string;
  minOverlap: number;
}

export interface UseMatchSwiperReturn {
  // State
  phase: SwiperPhase;
  currentMatch: TradeMatch | null;
  currentIndex: number;
  totalMatches: number;
  radiusKm: number | null;
  radiusTierIndex: number;
  selectedCollectionId: number | null;
  selectedCollectionTitle: string | null;
  collections: ReturnType<typeof useUserCollections>['collections'];
  collectionsLoading: boolean;
  filters: MatchSwiperFilters;
  geoCoords: { lat: number; lon: number } | null;
  error: string | null;
  loading: boolean;
  // For grid mode
  allMatches: TradeMatch[];
  hasMore: boolean;

  // Actions
  pass: () => void;
  propose: () => { userId: string; collectionId: number } | null;
  expandRadius: () => void;
  resetSeen: () => void;
  setCollection: (id: number) => void;
  setFilters: (f: Partial<MatchSwiperFilters>) => void;
  requestGeo: () => void;
  dismissGeoPrompt: () => void;
  loadMore: () => void;
}

export function useMatchSwiper(): UseMatchSwiperReturn {
  const { user, loading: authLoading } = useUser();
  const { collections, loading: collectionsLoading } = useUserCollections();
  const { matches: rawMatches, loading, error, hasMore, searchTrades, clearResults } = useFindTraders();

  // ---- Core state ----
  // selectedCollectionId stores the copy_id (for UI/seen tracking)
  // but we also derive the template_id (for the RPC)
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);
  const [radiusTierIndex, setRadiusTierIndex] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<SwiperPhase>('loading');
  const [filters, setFiltersState] = useState<MatchSwiperFilters>({
    rarity: '',
    team: '',
    query: '',
    minOverlap: DEFAULT_MIN_OVERLAP,
  });

  // Geolocation
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoPromptDismissed, setGeoPromptDismissed] = useState(false);
  const [geoChecked, setGeoChecked] = useState(false);

  // Track unseen matches for spotlight
  const [unseenMatches, setUnseenMatches] = useState<TradeMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchedRef = useRef(false);
  const collectionInitRef = useRef(false);

  // ---- Derived ----
  const radiusKm = RADIUS_TIERS[radiusTierIndex] ?? null;
  const currentMatch = unseenMatches[currentIndex] ?? null;
  const selectedCollection = collections.find(c => c.copy_id === selectedCopyId);
  const selectedCollectionId = selectedCopyId; // exposed as selectedCollectionId for API compat
  const selectedTemplateId = selectedCollection?.template_id ?? null;

  // ---- Auto-select collection ----
  useEffect(() => {
    if (collections.length > 0 && !collectionInitRef.current) {
      collectionInitRef.current = true;
      const active = collections.find(c => c.is_active);
      const id = active ? active.copy_id : collections[0].copy_id;
      setSelectedCopyId(id);
      setSeenIds(loadSeen(id));
    }
  }, [collections]);

  // ---- Restore geo from localStorage ----
  useEffect(() => {
    const stored = localStorage.getItem('matchfinder_geo');
    if (stored === 'granted') {
      navigator.geolocation?.getCurrentPosition(
        pos => {
          setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setGeoChecked(true);
        },
        () => {
          setGeoChecked(true);
        }
      );
    } else if (stored === 'dismissed') {
      setGeoPromptDismissed(true);
      setGeoChecked(true);
    } else {
      setGeoChecked(true);
    }
  }, []);

  // ---- Fetch matches ----
  const doFetch = useCallback(() => {
    if (!user || !selectedTemplateId) return;
    fetchedRef.current = true;
    setPhase('loading');

    searchTrades({
      userId: user.id,
      collectionId: selectedTemplateId,
      filters: {
        rarity: filters.rarity || undefined,
        team: filters.team || undefined,
        query: filters.query || undefined,
        minOverlap: filters.minOverlap,
      },
      lat: geoCoords?.lat ?? null,
      lon: geoCoords?.lon ?? null,
      radiusKm: radiusKm ?? undefined,
      sort: 'overlap',
      limit: BATCH_SIZE,
      offset: 0,
    });
  }, [user, selectedTemplateId, filters, geoCoords, radiusKm, searchTrades]);

  // ---- Trigger fetch when deps change ----
  useEffect(() => {
    if (user && selectedTemplateId && geoChecked && !authLoading && !collectionsLoading) {
      // Check if we should show geo prompt first
      if (!geoCoords && !geoPromptDismissed && !localStorage.getItem('matchfinder_geo')) {
        setPhase('geo_prompt');
        return;
      }
      doFetch();
    }
  }, [user, selectedTemplateId, geoChecked, geoCoords, geoPromptDismissed, authLoading, collectionsLoading, doFetch]);

  // ---- Process raw matches into unseen ----
  useEffect(() => {
    if (loading) return;

    const unseen = rawMatches.filter(m => !seenIds.has(m.match_user_id));
    setUnseenMatches(unseen);
    setCurrentIndex(0);

    if (unseen.length === 0 && fetchedRef.current && !error) {
      // No unseen matches — check if we can expand
      if (radiusTierIndex < RADIUS_TIERS.length - 1) {
        setPhase('expand');
      } else {
        setPhase('exhausted');
      }
    } else if (unseen.length > 0) {
      setPhase('swiping');
    }
  }, [rawMatches, loading, seenIds, radiusTierIndex, error]);

  // ---- Actions ----
  const markSeen = useCallback((userId: string) => {
    if (!selectedCopyId) return;
    setSeenIds(prev => {
      const next = new Set(prev);
      next.add(userId);
      saveSeen(selectedCopyId, next);
      return next;
    });
  }, [selectedCopyId]);

  const pass = useCallback(() => {
    if (!currentMatch) return;
    markSeen(currentMatch.match_user_id);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= unseenMatches.length) {
      // All current batch seen
      const remaining = rawMatches.filter(m => !seenIds.has(m.match_user_id) && m.match_user_id !== currentMatch.match_user_id);
      if (remaining.length === 0) {
        if (radiusTierIndex < RADIUS_TIERS.length - 1) {
          setPhase('expand');
        } else {
          setPhase('exhausted');
        }
      }
    } else {
      setCurrentIndex(nextIndex);
    }
  }, [currentMatch, currentIndex, unseenMatches, rawMatches, seenIds, markSeen, radiusTierIndex]);

  const propose = useCallback((): { userId: string; collectionId: number } | null => {
    if (!currentMatch || !selectedCopyId) return null;
    markSeen(currentMatch.match_user_id);

    const result = {
      userId: currentMatch.match_user_id,
      collectionId: selectedCopyId,
    };

    // Advance to next after returning
    const nextIndex = currentIndex + 1;
    if (nextIndex >= unseenMatches.length) {
      if (radiusTierIndex < RADIUS_TIERS.length - 1) {
        setPhase('expand');
      } else {
        setPhase('exhausted');
      }
    } else {
      setCurrentIndex(nextIndex);
    }

    return result;
  }, [currentMatch, selectedCopyId, currentIndex, unseenMatches, markSeen, radiusTierIndex]);

  const expandRadius = useCallback(() => {
    const nextTier = Math.min(radiusTierIndex + 1, RADIUS_TIERS.length - 1);
    setRadiusTierIndex(nextTier);
    // doFetch will be triggered by the radiusKm change via useEffect
  }, [radiusTierIndex]);

  const resetSeen = useCallback(() => {
    if (!selectedCopyId) return;
    setSeenIds(new Set());
    localStorage.removeItem(getSeenKey(selectedCopyId));
    setRadiusTierIndex(0);
    setCurrentIndex(0);
    fetchedRef.current = false;
    doFetch();
  }, [selectedCopyId, doFetch]);

  const setCollection = useCallback((id: number) => {
    setSelectedCopyId(id);
    setSeenIds(loadSeen(id));
    setCurrentIndex(0);
    setRadiusTierIndex(0);
    fetchedRef.current = false;
    clearResults();
  }, [clearResults]);

  const setFilters = useCallback((partial: Partial<MatchSwiperFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
    setCurrentIndex(0);
    fetchedRef.current = false;
  }, []);

  const requestGeo = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        localStorage.setItem('matchfinder_geo', 'granted');
        setGeoPromptDismissed(true);
      },
      (err) => {
        logger.warn('Geolocation denied:', err);
        setGeoPromptDismissed(true);
        localStorage.setItem('matchfinder_geo', 'dismissed');
      }
    );
  }, []);

  const dismissGeoPrompt = useCallback(() => {
    setGeoPromptDismissed(true);
    localStorage.setItem('matchfinder_geo', 'dismissed');
  }, []);

  const loadMore = useCallback(() => {
    if (!user || !selectedTemplateId) return;
    searchTrades({
      userId: user.id,
      collectionId: selectedTemplateId,
      filters: {
        rarity: filters.rarity || undefined,
        team: filters.team || undefined,
        query: filters.query || undefined,
        minOverlap: filters.minOverlap,
      },
      lat: geoCoords?.lat ?? null,
      lon: geoCoords?.lon ?? null,
      radiusKm: radiusKm ?? undefined,
      sort: 'overlap',
      limit: BATCH_SIZE,
      offset: rawMatches.length,
    });
  }, [user, selectedTemplateId, filters, geoCoords, radiusKm, rawMatches.length, searchTrades]);

  return {
    phase: authLoading || collectionsLoading ? 'loading' : phase,
    currentMatch,
    currentIndex,
    totalMatches: unseenMatches.length,
    radiusKm,
    radiusTierIndex,
    selectedCollectionId,
    selectedCollectionTitle: selectedCollection?.title ?? null,
    collections,
    collectionsLoading,
    filters,
    geoCoords,
    error,
    loading,
    allMatches: rawMatches,
    hasMore,

    pass,
    propose,
    expandRadius,
    resetSeen,
    setCollection,
    setFilters,
    requestGeo,
    dismissGeoPrompt,
    loadMore,
  };
}
