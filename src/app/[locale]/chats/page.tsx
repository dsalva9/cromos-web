'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from '@/components/ui/link';
import Image from 'next/image';
import AuthGuard from '@/components/AuthGuard';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { MessageCircle, Lightbulb, Sparkles, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextualTip } from '@/components/ui/ContextualTip';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ChatDrawer } from '@/components/chats/ChatDrawer';
import { useMatchConversations } from '@/hooks/chats/useMatchConversations';
import { logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface Conversation {
  listing_id: number;
  listing_title: string;
  listing_image_url: string | null;
  listing_status: string;
  counterparty_id: string;
  counterparty_nickname: string;
  counterparty_avatar_url: string | null;
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
  is_seller: boolean;
}

// ------------------------------------------------------------------
// Page content
// ------------------------------------------------------------------
function ChatsPageContent() {
  const t = useTranslations('chats');
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const searchParams = useSearchParams();

  // Tab state — default from URL or 'marketplace'
  const initialTab = searchParams.get('tab') === 'match' ? 'match' : 'marketplace';
  const [activeTab, setActiveTab] = useState(initialTab);

  // ---- Marketplace conversations ----
  const [marketplaceConvs, setMarketplaceConvs] = useState<Conversation[]>([]);
  const [mpLoading, setMpLoading] = useState(true);
  const [hidingId, setHidingId] = useState<string | null>(null);

  // ---- Match conversations ----
  const matchConvs = useMatchConversations();

  // ---- Chat drawer state (for match chats opened inline) ----
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMatchConv, setActiveMatchConv] = useState<{
    id: number;
    otherNickname: string;
    otherAvatarUrl: string | null;
    collectionTitle: string | null;
    templateId: number | null;
    otherUserId: string;
  } | null>(null);

  // Fetch marketplace conversations
  useEffect(() => {
    async function fetchConversations() {
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_conversations');

      if (error) {
        logger.error('Error fetching conversations:', error);
      } else if (data) {
        setMarketplaceConvs(data);
      }

      setMpLoading(false);
    }

    void fetchConversations();
  }, [user, supabase]);

  // Hide a marketplace conversation
  const handleHideConversation = useCallback(async (
    e: React.MouseEvent,
    conv: Conversation
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const key = `${conv.listing_id}-${conv.counterparty_id}`;
    setHidingId(key);
    try {
      const { error } = await supabase.rpc('hide_conversation', {
        p_listing_id: conv.listing_id,
        p_counterparty_id: conv.counterparty_id,
      });
      if (error) throw error;
      setMarketplaceConvs(prev =>
        prev.filter(c =>
          !(c.listing_id === conv.listing_id && c.counterparty_id === conv.counterparty_id)
        )
      );
      toast.success(t('hide.success'));
    } catch (err) {
      logger.error('Error hiding conversation:', err);
      toast.error(t('hide.error'));
    } finally {
      setHidingId(null);
    }
  }, [supabase, t]);

  // Open match chat drawer
  const openMatchChat = useCallback((conv: typeof matchConvs.conversations[0]) => {
    setActiveMatchConv({
      id: conv.id,
      otherNickname: conv.other_nickname,
      otherAvatarUrl: conv.other_avatar_url,
      collectionTitle: conv.template_title,
      templateId: conv.template_id,
      otherUserId: conv.other_user_id,
    });
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setActiveMatchConv(null);
    // Refresh conversations silently to update unread counts
    void matchConvs.refresh({ silent: true });
  }, [matchConvs]);

  // Loading state
  const isLoading = activeTab === 'marketplace' ? mpLoading : matchConvs.loading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <SegmentedTabs
            tabs={[
              {
                value: 'marketplace',
                label: t('tabs.marketplace'),
                icon: <MessageCircle className="w-4 h-4" />,
              },
              {
                value: 'match',
                label: t('tabs.match'),
                icon: <Sparkles className="w-4 h-4" />,
                badge: matchConvs.unreadTotal > 0 ? (
                  <span className="bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {matchConvs.unreadTotal}
                  </span>
                ) : undefined,
              },
            ]}
            value={activeTab}
            onValueChange={setActiveTab}
            aria-label="Chat tabs"
          />
        </div>

        <ContextualTip
          tipId="tip-chats"
          icon={Lightbulb}
          title={t('tip.title')}
          description={t('tip.description')}
          className="mb-6"
        />

        {/* ---- Marketplace tab ---- */}
        {activeTab === 'marketplace' && (
          <>
            {marketplaceConvs.length === 0 ? (
              <ModernCard>
                <ModernCardContent className="p-8 text-center">
                  <MessageCircle className="h-16 w-16 text-gray-400 dark:text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                    {t('empty.title')}
                  </p>
                  <Link
                    href="/marketplace"
                    className="inline-block bg-gold text-black px-6 py-2 rounded-md font-bold hover:bg-yellow-400 transition-colors"
                  >
                    {t('empty.action')}
                  </Link>
                </ModernCardContent>
              </ModernCard>
            ) : (
              <div className="space-y-3">
                {marketplaceConvs.map((conv) => (
                  <Link
                    key={`${conv.listing_id}-${conv.counterparty_id}`}
                    href={`/marketplace/${conv.listing_id}/chat${conv.is_seller ? `?participant=${conv.counterparty_id}` : ''}`}
                  >
                    <ModernCard className="hover:border-gold transition-colors cursor-pointer relative group">
                      <ModernCardContent className="p-4">
                        {/* Hide conversation button */}
                        <button
                          onClick={(e) => void handleHideConversation(e, conv)}
                          disabled={hidingId === `${conv.listing_id}-${conv.counterparty_id}`}
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all duration-200"
                          title={t('hide.button')}
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>

                        <div className="flex gap-4">
                          {conv.listing_image_url && (
                            <div className="relative w-20 h-20 flex-shrink-0">
                              <Image
                                src={conv.listing_image_url}
                                alt={conv.listing_title}
                                fill
                                className="object-cover rounded-md border border-gray-200 dark:border-gray-700"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 dark:text-white truncate">
                                {conv.listing_title}
                              </h3>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-xs font-bold uppercase flex-shrink-0',
                                  conv.listing_status === 'active' && 'bg-green-100 text-green-700',
                                  conv.listing_status === 'reserved' && 'bg-yellow-100 text-yellow-700',
                                  conv.listing_status === 'completed' && 'bg-blue-100 text-blue-700',
                                  conv.listing_status === 'sold' && 'bg-gray-200 text-gray-700'
                                )}
                              >
                                {conv.listing_status === 'active' && t('status.active')}
                                {conv.listing_status === 'reserved' && t('status.reserved')}
                                {conv.listing_status === 'completed' && t('status.completed')}
                                {conv.listing_status === 'sold' && t('status.completed')}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {conv.is_seller ? (
                                <>{t('roles.buyer')} {conv.counterparty_nickname}</>
                              ) : (
                                <>{t('roles.seller')} {conv.counterparty_nickname}</>
                              )}
                            </p>

                            {conv.last_message && (
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                                  {conv.last_message}
                                </p>
                                {conv.unread_count > 0 && (
                                  <span className="bg-gold text-black text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                            )}

                            {conv.last_message_at && (
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(conv.last_message_at).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </ModernCardContent>
                    </ModernCard>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---- Match tab ---- */}
        {activeTab === 'match' && (
          <>
            {matchConvs.conversations.length === 0 ? (
              <ModernCard>
                <ModernCardContent className="p-8 text-center">
                  <Sparkles className="h-16 w-16 text-gray-400 dark:text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                    {t('match.emptyTitle')}
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
                    {t('match.emptyDesc')}
                  </p>
                  <Link
                    href="/intercambios/buscar"
                    className="inline-block bg-gold text-black px-6 py-2 rounded-md font-bold hover:bg-yellow-400 transition-colors"
                  >
                    {t('match.emptyCta')}
                  </Link>
                </ModernCardContent>
              </ModernCard>
            ) : (
              <div className="space-y-3">
                {matchConvs.conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openMatchChat(conv)}
                    className="w-full text-left"
                  >
                    <ModernCard className="hover:border-gold transition-colors cursor-pointer">
                      <ModernCardContent className="p-4">
                        <div className="flex gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {conv.other_avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={conv.other_avatar_url} alt={conv.other_nickname} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-bold text-gold">
                                {conv.other_nickname.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <h3 className="font-bold text-gray-900 dark:text-white truncate">
                                {conv.other_nickname}
                              </h3>
                              {conv.unread_count > 0 && (
                                <span className="bg-gold text-black text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>

                            {conv.template_title && (
                              <p className="text-xs text-gold font-semibold mb-1 truncate">
                                {t('match.collection', { name: conv.template_title })}
                              </p>
                            )}

                            {conv.last_message && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {conv.last_message}
                              </p>
                            )}

                            {conv.last_message_at && (
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(conv.last_message_at).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      </ModernCardContent>
                    </ModernCard>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        conversationId={activeMatchConv?.id ?? null}
        otherNickname={activeMatchConv?.otherNickname ?? ''}
        otherAvatarUrl={activeMatchConv?.otherAvatarUrl}
        collectionTitle={activeMatchConv?.collectionTitle}
        templateId={activeMatchConv?.templateId}
        otherUserId={activeMatchConv?.otherUserId}
      />
    </div>
  );
}

export default function ChatsPage() {
  return (
    <AuthGuard>
      <ChatsPageContent />
    </AuthGuard>
  );
}
