'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { Eye, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';

interface HiddenConversation {
  listing_id: number;
  listing_title: string;
  listing_image_url: string | null;
  counterparty_id: string;
  counterparty_nickname: string;
  counterparty_avatar_url: string | null;
  hidden_at: string;
}

export function HiddenChatsTab() {
  const t = useTranslations('settings');
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [conversations, setConversations] = useState<HiddenConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unhidingId, setUnhidingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHiddenConversations() {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc('get_hidden_conversations');
        if (error) throw error;
        setConversations(data ?? []);
      } catch (err) {
        logger.error('Error fetching hidden conversations:', err);
        setError(t('hiddenChats.errorLoad'));
      } finally {
        setLoading(false);
      }
    }

    void fetchHiddenConversations();
  }, [user, supabase, t]);

  const handleUnhideConversation = async (conv: HiddenConversation) => {
    const compositeId = `${conv.listing_id}-${conv.counterparty_id}`;
    setUnhidingId(compositeId);
    try {
      const { error } = await supabase.rpc('unhide_conversation', {
        p_listing_id: conv.listing_id,
        p_counterparty_id: conv.counterparty_id,
      });

      if (error) throw error;

      toast.success(t('hiddenChats.unhide.success', { title: conv.listing_title }));
      setConversations(prev =>
        prev.filter(
          c =>
            c.listing_id !== conv.listing_id ||
            c.counterparty_id !== conv.counterparty_id
        )
      );
    } catch (err) {
      logger.error('Error unhiding conversation:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : t('hiddenChats.unhide.error')
      );
    } finally {
      setUnhidingId(null);
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
        >{t('hiddenChats.retry')}</Button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <ModernCard className="bg-white dark:bg-gray-800/10 backdrop-blur-sm border border-gray-200 dark:border-gray-700/20">
        <ModernCardContent className="p-16 text-center">
          <Eye className="w-20 h-20 text-gray-400 dark:text-white/50 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('hiddenChats.empty.title')}</h2>
          <p className="text-gray-600 dark:text-white/80 text-lg">{t('hiddenChats.empty.description')}</p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <div className="space-y-4">
      {conversations.map(conv => {
        const compositeId = `${conv.listing_id}-${conv.counterparty_id}`;
        return (
          <ModernCard
            key={compositeId}
            className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-700 hover:shadow-xl transition-all duration-300"
          >
            <ModernCardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Conversation Info */}
                <div className="flex items-center gap-4">
                  {/* Image */}
                  <Link
                    href={`/marketplace/${conv.listing_id}`}
                    className="flex-shrink-0"
                  >
                    {conv.listing_image_url ? (
                      <Image
                        src={conv.listing_image_url}
                        alt={conv.listing_title}
                        width={60}
                        height={60}
                        className="rounded-md border-2 border-black dark:border-gray-700 object-cover hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-15 h-15 rounded-md bg-gold border-2 border-black dark:border-gray-700 flex items-center justify-center hover:opacity-80 transition-opacity">
                        <MessageCircle className="h-8 w-8 text-black" />
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div>
                    <Link
                      href={`/marketplace/${conv.listing_id}`}
                      className="block"
                    >
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white hover:text-gold transition-colors">
                        {conv.listing_title}
                      </h3>
                    </Link>
                    <p className="text-sm text-gold font-semibold">
                      {t('hiddenChats.by')} {conv.counterparty_nickname}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {t('hiddenChats.time.hidden')} {formatDate(conv.hidden_at)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void handleUnhideConversation(conv)
                    }
                    disabled={unhidingId === compositeId}
                    className="border-2 border-black dark:border-gray-700 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 hover:bg-gold hover:text-gray-900 dark:hover:text-gray-900"
                  >
                    {unhidingId === compositeId ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('hiddenChats.unhide.loading')}</>
                    ) : (
                      t('hiddenChats.unhide.button')
                    )}
                  </Button>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        );
      })}
    </div>
  );
}
