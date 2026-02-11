'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/ui/link';
import Image from 'next/image';
import AuthGuard from '@/components/AuthGuard';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { MessageCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextualTip } from '@/components/ui/ContextualTip';
import { logger } from '@/lib/logger';

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

function ChatsPageContent() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_conversations');

      if (error) {
        logger.error('Error fetching conversations:', error);
      } else if (data) {
        setConversations(data);
      }

      setLoading(false);
    }

    void fetchConversations();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Mis Chats</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Todas tus conversaciones sobre anuncios del marketplace
          </p>
        </div>

        <ContextualTip
          tipId="tip-chats"
          icon={Lightbulb}
          title="Tus conversaciones"
          description="Aquí verás todos los chats sobre anuncios del Marketplace. También puedes marcar usuarios como favoritos para encontrarlos fácilmente después."
          className="mb-6"
        />

        {conversations.length === 0 ? (
          <ModernCard>
            <ModernCardContent className="p-8 text-center">
              <MessageCircle className="h-16 w-16 text-gray-400 dark:text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                No tienes conversaciones activas
              </p>
              <Link
                href="/marketplace"
                className="inline-block bg-[#FFC000] text-black px-6 py-2 rounded-md font-bold hover:bg-yellow-400 transition-colors"
              >
                Explorar Marketplace
              </Link>
            </ModernCardContent>
          </ModernCard>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Link
                key={`${conv.listing_id}-${conv.counterparty_id}`}
                href={`/marketplace/${conv.listing_id}/chat${conv.is_seller ? `?participant=${conv.counterparty_id}` : ''}`}
              >
                <ModernCard className="hover:border-[#FFC000] transition-colors cursor-pointer">
                  <ModernCardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Listing Image */}
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

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title and Status */}
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
                            {conv.listing_status === 'active' && 'Activo'}
                            {conv.listing_status === 'reserved' && 'Reservado'}
                            {conv.listing_status === 'completed' && 'Completado'}
                            {conv.listing_status === 'sold' && 'Completado'}
                          </span>
                        </div>

                        {/* Counterparty */}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {conv.is_seller ? (
                            <>Comprador: {conv.counterparty_nickname}</>
                          ) : (
                            <>Vendedor: {conv.counterparty_nickname}</>
                          )}
                        </p>

                        {/* Last Message */}
                        {conv.last_message && (
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                              {conv.last_message}
                            </p>
                            {conv.unread_count > 0 && (
                              <span className="bg-[#FFC000] text-black text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
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
      </div>
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
