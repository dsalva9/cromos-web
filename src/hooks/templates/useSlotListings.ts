import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

interface SlotListing {
  id: number;
  title: string;
  status: 'active' | 'sold' | 'removed';
}

/**
 * Hook to fetch active marketplace listings for specific slots
 * Used to show "Publicado" badge in collection view
 *
 * @param copyId - Template copy ID
 * @returns Map of slot_id -> listing info
 */
export function useSlotListings(copyId: string) {
  const supabase = useSupabaseClient();
  const [slotListings, setSlotListings] = useState<Record<string, SlotListing>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlotListings = async () => {
      try {
        setLoading(true);

        // Fetch all active listings for this copy
        const { data, error } = await supabase
          .from('trade_listings')
          .select('id, slot_id, title, status')
          .eq('copy_id', parseInt(copyId))
          .eq('status', 'active');

        if (error) throw error;

        // Create map of slot_id -> listing
        const listingsMap: Record<string, SlotListing> = {};
        (data || []).forEach((listing) => {
          if (listing.slot_id) {
            listingsMap[listing.slot_id.toString()] = {
              id: listing.id,
              title: listing.title,
              status: listing.status as 'active' | 'sold' | 'removed',
            };
          }
        });

        setSlotListings(listingsMap);
      } catch (error) {
        logger.error('Error fetching slot listings:', error);
        setSlotListings({});
      } finally {
        setLoading(false);
      }
    };

    if (copyId) {
      fetchSlotListings();
    }
  }, [copyId, supabase]);

  return { slotListings, loading };
}
