'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { Eye, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';

interface IgnoredListing {
  listing_id: number;
  listing_title: string;
  listing_image_url: string | null;
  listing_status: string;
  collection_name: string | null;
  author_nickname: string;
  ignored_at: string;
}

export function IgnoredListingsTab() {
  const t = useTranslations('settings');
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [listings, setListings] = useState<IgnoredListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unignoringId, setUnignoringId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchIgnoredListings() {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc('get_ignored_listings');
        if (error) throw error;
        setListings(data ?? []);
      } catch (err) {
        logger.error('Error fetching ignored listings:', err);
        setError(t('ignoredListings.errorLoad'));
      } finally {
        setLoading(false);
      }
    }

    void fetchIgnoredListings();
  }, [user, supabase, t]);

  const handleUnignoreListing = async (listingId: number, title: string) => {
    setUnignoringId(listingId);
    try {
      const { error } = await supabase.rpc('unignore_listing', {
        p_listing_id: listingId,
      });

      if (error) throw error;

      toast.success(t('ignoredListings.unignore.success', { title }));
      setListings(prev => prev.filter(l => l.listing_id !== listingId));
    } catch (err) {
      logger.error('Error unignoring listing:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : t('ignoredListings.unignore.error')
      );
    } finally {
      setUnignoringId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('ignoredListings.time.today');
    if (diffDays === 1) return t('ignoredListings.time.yesterday');
    if (diffDays < 7)
      return diffDays === 1
        ? t('ignoredListings.time.dayAgo', { count: diffDays })
        : t('ignoredListings.time.daysAgo', { count: diffDays });
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1
        ? t('ignoredListings.time.weekAgo', { count: weeks })
        : t('ignoredListings.time.weeksAgo', { count: weeks });
    }
    const months = Math.floor(diffDays / 30);
    return months === 1
      ? t('ignoredListings.time.monthAgo', { count: months })
      : t('ignoredListings.time.monthsAgo', { count: months });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-gold hover:bg-[#FFD633] text-gray-900"
        >{t('ignoredListings.retry')}</Button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <ModernCard className="bg-white dark:bg-gray-800/10 backdrop-blur-sm border border-gray-200 dark:border-gray-700/20">
        <ModernCardContent className="p-16 text-center">
          <Eye className="w-20 h-20 text-gray-400 dark:text-white/50 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('ignoredListings.empty.title')}</h2>
          <p className="text-gray-600 dark:text-white/80 text-lg">{t('ignoredListings.empty.description')}</p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <div className="space-y-4">
      {listings.map(listing => (
        <ModernCard
          key={listing.listing_id}
          className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-700 hover:shadow-xl transition-all duration-300"
        >
          <ModernCardContent className="p-6">
            <div className="flex items-center justify-between">
              {/* Listing Info */}
              <div className="flex items-center gap-4">
                {/* Image */}
                <Link
                  href={`/marketplace/${listing.listing_id}`}
                  className="flex-shrink-0"
                >
                  {listing.listing_image_url ? (
                    <Image
                      src={listing.listing_image_url}
                      alt={listing.listing_title}
                      width={60}
                      height={60}
                      className="rounded-md border-2 border-black dark:border-gray-700 object-cover hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-15 h-15 rounded-md bg-gold border-2 border-black dark:border-gray-700 flex items-center justify-center hover:opacity-80 transition-opacity">
                      <Package className="h-8 w-8 text-black" />
                    </div>
                  )}
                </Link>

                {/* Details */}
                <div>
                  <Link
                    href={`/marketplace/${listing.listing_id}`}
                    className="block"
                  >
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white hover:text-gold transition-colors">
                      {listing.listing_title}
                    </h3>
                  </Link>
                  {listing.collection_name && (
                    <p className="text-sm text-gold font-semibold">
                      {listing.collection_name}
                    </p>
                  )}
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('ignoredListings.by')} {listing.author_nickname} · {t('ignoredListings.time.ignored')} {formatDate(listing.ignored_at)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void handleUnignoreListing(
                      listing.listing_id,
                      listing.listing_title
                    )
                  }
                  disabled={unignoringId === listing.listing_id}
                  className="border-2 border-black dark:border-gray-700 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 hover:bg-gold hover:text-gray-900 dark:hover:text-gray-900"
                >
                  {unignoringId === listing.listing_id ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('ignoredListings.unignore.loading')}</>
                  ) : (
                    t('ignoredListings.unignore.button')
                  )}
                </Button>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      ))}
    </div>
  );
}
