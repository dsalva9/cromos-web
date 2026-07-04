'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Loader2, MessageCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { getOrCreateMatchConversation } from '@/lib/supabase/matches/chat';
import { ChatDrawer } from '@/components/chats/ChatDrawer';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

interface OverlapItem {
  template_id: number;
  collection_name: string;
  they_have_for_you: number;
  you_have_for_them: number;
  total_overlap: number;
}

interface MatchResultViewProps {
  /** The user whose QR was scanned */
  theirUserId: string;
  theirNickname: string;
  theirAvatarUrl?: string | null;
  /** Pre-filter to a specific collection (from QR copy_id) — if omitted shows all */
  copyId?: number;
}

export function MatchResultView({
  theirUserId,
  theirNickname,
  theirAvatarUrl,
  copyId,
}: MatchResultViewProps) {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const [overlaps, setOverlaps] = useState<OverlapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatData, setChatData] = useState<{
    conversationId: number;
    templateId: number;
    collectionTitle: string;
    theyHaveCount: number;
    youHaveCount: number;
  } | null>(null);

  useEffect(() => {
    if (!user || user.id === theirUserId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchOverlap() {
      try {
        const { data, error } = await supabase.rpc('get_user_trade_overlap', {
          p_my_user_id: user!.id,
          p_their_user_id: theirUserId,
        });
        if (error) throw error;
        if (!cancelled && data) {
          setOverlaps(data as OverlapItem[]);
        }
      } catch (err) {
        logger.error('MatchResultView: overlap fetch failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchOverlap();
    return () => { cancelled = true; };
  }, [user, theirUserId, supabase]);

  const handleStartTrade = useCallback(async (overlap: OverlapItem) => {
    if (proposing) return;
    setProposing(true);
    try {
      const { data, error } = await getOrCreateMatchConversation(
        supabase,
        theirUserId,
        overlap.template_id,
      );
      if (error || !data) {
        toast.error('Error al abrir el chat');
        return;
      }
      setChatData({
        conversationId: data.id,
        templateId: overlap.template_id,
        collectionTitle: overlap.collection_name,
        theyHaveCount: overlap.they_have_for_you,
        youHaveCount: overlap.you_have_for_them,
      });
      setChatOpen(true);
    } finally {
      setProposing(false);
    }
  }, [proposing, supabase, theirUserId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
        <p className="text-sm">Buscando coincidencias…</p>
      </div>
    );
  }

  if (overlaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <ArrowLeftRight className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
          No hay coincidencias. Puede que{' '}
          <span className="font-bold text-gray-700 dark:text-gray-300">{theirNickname}</span>{' '}
          aún no tenga el mismo álbum que tú.
        </p>
      </div>
    );
  }

  // If scanned from a specific copy, try to surface that collection first
  const sorted = copyId
    ? [...overlaps].sort((a, b) => (b.template_id === copyId ? 1 : 0) - (a.template_id === copyId ? 1 : 0))
    : [...overlaps].sort((a, b) => b.total_overlap - a.total_overlap);

  return (
    <>
      <div className="space-y-3">
        {sorted.map((overlap) => (
          <div
            key={overlap.template_id}
            className="rounded-2xl border border-gold/30 bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-orange-50/40 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/10 dark:border-gold/20 p-4 relative overflow-hidden"
          >
            {/* Decorative glow */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-gold/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-gold" />
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                {overlap.collection_name}
              </p>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-white/70 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 p-3 text-center">
                <p className="text-2xl font-black text-gold">{overlap.they_have_for_you}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  Tiene lo que<br />te falta
                </p>
              </div>
              <div className="rounded-xl bg-white/70 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 p-3 text-center">
                <p className="text-2xl font-black text-gold">{overlap.you_have_for_them}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  Tienes lo que<br />le falta
                </p>
              </div>
            </div>

            {/* CTA */}
            <Button
              className="w-full bg-gold text-black hover:bg-yellow-400 font-bold"
              disabled={proposing}
              onClick={() => void handleStartTrade(overlap)}
            >
              {proposing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
              )}
              Proponer intercambio
            </Button>
          </div>
        ))}
      </div>

      {chatData && (
        <ChatDrawer
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          conversationId={chatData.conversationId}
          otherNickname={theirNickname}
          otherAvatarUrl={theirAvatarUrl}
          collectionTitle={chatData.collectionTitle}
          templateId={chatData.templateId}
          otherUserId={theirUserId}
          theyHaveCount={chatData.theyHaveCount}
          youHaveCount={chatData.youHaveCount}
        />
      )}
    </>
  );
}
