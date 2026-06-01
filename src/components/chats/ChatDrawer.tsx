'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Info, ArrowLeft, MoreVertical, Flag, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useMatchChat } from '@/hooks/chats/useMatchChat';
import { useTradeConfirmations } from '@/hooks/marketplace/useTradeConfirmations';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { MatchDetailDrawer } from '@/components/trades/MatchDetailDrawer';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';
import { useIgnore } from '@/hooks/social/useIgnore';
import { useReport } from '@/hooks/social/useReport';
import { toast } from '@/lib/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number | null;
  otherNickname: string;
  otherAvatarUrl?: string | null;
  collectionTitle?: string | null;
  templateId?: number | null;
  otherUserId?: string;
  /** Overlap stats for info modal */
  theyHaveCount?: number;
  youHaveCount?: number;
  distanceKm?: number | null;
}

export function ChatDrawer({
  isOpen,
  onClose,
  conversationId,
  otherNickname,
  otherAvatarUrl,
  collectionTitle,
  templateId,
  otherUserId,
  theyHaveCount,
  youHaveCount,
  distanceKm,
}: ChatDrawerProps) {
  const t = useTranslations('matchChat');
  const { user } = useUser();
  const [showInfo, setShowInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { ignoreUser, loading: ignoreLoading } = useIgnore();
  const { submitReport, loading: reportLoading } = useReport();

  const {
    messages,
    loading,
    sending,
    uploading,
    hasMore,
    sendMessage,
    loadMore,
    messagesEndRef,
  } = useMatchChat({
    conversationId: isOpen ? conversationId : null,
    enableRealtime: isOpen,
  });

  // Trade Confirmations state
  const t_tc = useTranslations('tradeConfirmations');
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [showNudgeForm, setShowNudgeForm] = useState(false);
  const [nudgeStickerCount, setNudgeStickerCount] = useState<string>('');
  const [nudgeNote, setNudgeNote] = useState<string>('');

  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStickerCount, setManualStickerCount] = useState<string>('');
  const [manualNote, setManualNote] = useState<string>('');

  const {
    pendingConfirmation,
    pendingForMe,
    pendingByMe,
    shouldShowNudge,
    requestConfirmation,
    confirmTrade,
    dismissConfirmation,
    submitting: confirmationSubmitting,
  } = useTradeConfirmations({
    matchConversationId: isOpen && conversationId ? conversationId : undefined,
    participantId: otherUserId || '',
    messages,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && chatContainerRef.current) {
      const el = chatContainerRef.current;
      // Only auto-scroll if user is near the bottom
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, messagesEndRef]);

  // Force scroll on first open
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, [isOpen, conversationId, messages.length, messagesEndRef]);

  // Lock body scroll on mobile when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[105] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel: fullscreen mobile, centered modal desktop */}
      <div
        className={cn(
          'fixed z-[110] flex flex-col bg-white dark:bg-gray-900',
          // Mobile: full screen
          'inset-0',
          // Desktop: centered modal
          'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-[500px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl sm:border-2 sm:border-black sm:shadow-2xl'
        )}
      >
        {/* ---- Header ---- */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
        >
          {/* Back button (mobile) */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-gold hover:text-yellow-600 font-bold text-sm sm:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
            {otherAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={otherAvatarUrl} alt={otherNickname} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-gold">
                {otherNickname.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name + collection — name links to profile */}
          <div className="flex-1 min-w-0">
            {otherUserId ? (
              <Link href={`/users/${otherUserId}`} className="font-bold text-gray-900 dark:text-white truncate text-sm block hover:text-gold transition-colors">
                {otherNickname}
              </Link>
            ) : (
              <p className="font-bold text-gray-900 dark:text-white truncate text-sm">
                {otherNickname}
              </p>
            )}
            {collectionTitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {collectionTitle}
              </p>
            )}
          </div>

          {/* Info button */}
          <button
            onClick={() => setShowInfo(true)}
            className="text-gray-400 hover:text-gold transition-colors p-1"
            title={t('info.title')}
          >
            <Info className="w-5 h-5" />
          </button>

          {/* More menu (block/report) */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl min-w-[180px] py-1">
                  <button
                    disabled={reportLoading}
                    onClick={async () => {
                      if (!otherUserId) return;
                      try {
                        await submitReport('user', otherUserId, 'inappropriate_behavior', 'Reported from match chat');
                        toast.success(t('reported'));
                      } catch {
                        toast.error('Error al reportar');
                      }
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    {t('reportUser')}
                  </button>
                  <button
                    disabled={ignoreLoading}
                    onClick={async () => {
                      if (!otherUserId) return;
                      const ok = await ignoreUser(otherUserId);
                      if (ok) {
                        setShowMenu(false);
                        onClose();
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    {t('blockUser')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Close button (desktop) */}
          <button
            onClick={onClose}
            className="hidden sm:flex text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ---- Messages area ---- */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-3 border-gold border-r-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-500 px-4">
              <span className="text-4xl mb-3">💬</span>
              <p className="text-sm">¡Empieza la conversación!</p>
            </div>
          ) : (
            <>
              {/* Load more */}
              {hasMore && (
                <div className="text-center mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadMore()}
                    className="text-xs text-gray-500"
                  >
                    {t('loadMore')}
                  </Button>
                </div>
              )}

              {/* Message bubbles */}
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === user?.id}
                />
              ))}

              {/* Top Confirmation Banner (when pendingForMe is true) */}
              {pendingConfirmation && pendingForMe && (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-gold rounded-lg p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-yellow-800 dark:text-yellow-200">
                  <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl">📬</span>
                    <div className="text-left">
                      <p className="font-semibold">
                        {t_tc('bannerTitle', { nickname: otherNickname })}
                      </p>
                      {(pendingConfirmation.sticker_count || pendingConfirmation.note) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {pendingConfirmation.sticker_count && `Cromos: ${pendingConfirmation.sticker_count}`}
                          {pendingConfirmation.sticker_count && pendingConfirmation.note && ' · '}
                          {pendingConfirmation.note && `Nota: "${pendingConfirmation.note}"`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={() => confirmTrade(pendingConfirmation.id)}
                      disabled={confirmationSubmitting}
                      className="bg-gold text-black hover:bg-yellow-400 font-bold flex-1 sm:flex-initial"
                    >
                      {t_tc('bannerConfirm')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissConfirmation(pendingConfirmation.id)}
                      disabled={confirmationSubmitting}
                      className="text-gray-500 hover:text-gray-900 dark:hover:text-white flex-1 sm:flex-initial"
                    >
                      {t_tc('bannerDismiss')}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Banner when I requested it and it is still pending */}
              {pendingConfirmation && pendingByMe && (
                <div className="bg-gray-100 dark:bg-gray-800/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 mb-4 text-xs text-center text-gray-500 dark:text-gray-400">
                  📬 Solicitud de confirmación de intercambio pendiente de aprobación por el otro usuario.
                </div>
              )}

              {/* Nudge card */}
              {shouldShowNudge && !nudgeDismissed && !showNudgeForm && (
                <div className="flex justify-center my-4 w-full">
                  <div className="bg-yellow-50/50 dark:bg-yellow-950/20 border-2 border-gold rounded-lg p-4 w-full max-w-[95%] sm:max-w-[85%] text-center space-y-3">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {t_tc('nudgeTitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setShowNudgeForm(true)}
                        className="bg-gold text-gold-foreground font-bold w-full sm:w-auto"
                      >
                        {t_tc('nudgeConfirm')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNudgeDismissed(true)}
                        className="text-gray-500 hover:text-gray-900 dark:hover:text-white w-full sm:w-auto"
                      >
                        {t_tc('nudgeNotYet')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Nudge count/note Form */}
              {shouldShowNudge && !nudgeDismissed && showNudgeForm && (
                <div className="bg-yellow-50/30 dark:bg-yellow-950/10 border-2 border-gold rounded-lg p-4 mb-4 space-y-3 text-sm">
                  <h4 className="font-bold text-gray-900 dark:text-white text-center">
                    {t_tc('nudgeConfirm')}
                  </h4>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t_tc('stickerCountLabel')}
                    </label>
                    <input
                      type="number"
                      value={nudgeStickerCount}
                      onChange={(e) => setNudgeStickerCount(e.target.value)}
                      placeholder={t_tc('stickerCountPlaceholder')}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Nota (opcional)
                    </label>
                    <input
                      type="text"
                      value={nudgeNote}
                      onChange={(e) => setNudgeNote(e.target.value)}
                      placeholder="Ej: Intercambio de 5 cromos de la copa"
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gold text-gold-foreground font-bold flex-1"
                      disabled={confirmationSubmitting}
                      onClick={async () => {
                        const count = nudgeStickerCount ? parseInt(nudgeStickerCount, 10) : undefined;
                        await requestConfirmation(count, nudgeNote || undefined);
                        setShowNudgeForm(false);
                        setNudgeDismissed(true);
                      }}
                    >
                      {t_tc('submitConfirmation')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        setShowNudgeForm(false);
                        setNudgeDismissed(true);
                      }}
                    >
                      {t_tc('bannerDismiss')}
                    </Button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>



        {/* ---- Composer ---- */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <ChatComposer
            onSend={sendMessage}
            sending={sending}
            uploading={uploading}
            disabled={!conversationId}
            showConfirmButton={messages.length >= 4 && !pendingConfirmation}
            onManualConfirm={() => setShowManualModal(true)}
          />
        </div>
      </div>

      {/* ---- Detail drawer (sticker-level) ---- */}
      {templateId && otherUserId && (
        <MatchDetailDrawer
          match={{
            match_user_id: otherUserId,
            nickname: otherNickname,
            overlap_from_them_to_me: theyHaveCount ?? 0,
            overlap_from_me_to_them: youHaveCount ?? 0,
            total_mutual_overlap: (theyHaveCount ?? 0) + (youHaveCount ?? 0),
            distance_km: distanceKm ?? null,
            postcode: null,
            score: null,
          }}
          collectionId={templateId}
          collectionTitle={collectionTitle ?? undefined}
          open={showInfo}
          onOpenChange={setShowInfo}
        />
      )}

      {/* Manual Confirmation Dialog */}
      <Dialog open={showManualModal} onOpenChange={setShowManualModal}>
        <DialogContent className="border-2 border-black max-w-[90%] sm:max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 z-[120]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <span>📬</span> {t_tc('manualButton')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t_tc('stickerCountLabel')}
              </label>
              <input
                type="number"
                value={manualStickerCount}
                onChange={(e) => setManualStickerCount(e.target.value)}
                placeholder={t_tc('stickerCountPlaceholder')}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Nota (opcional)
              </label>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Ej: Intercambio de 5 cromos de la copa"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowManualModal(false)}
              className="rounded-xl border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              {t_tc('bannerDismiss')}
            </Button>
            <Button
              disabled={confirmationSubmitting}
              onClick={async () => {
                const count = manualStickerCount ? parseInt(manualStickerCount, 10) : undefined;
                const success = await requestConfirmation(count, manualNote || undefined);
                if (success) {
                  setShowManualModal(false);
                  setManualStickerCount('');
                  setManualNote('');
                }
              }}
              className="bg-gold text-black hover:bg-yellow-400 font-bold rounded-xl"
            >
              {t_tc('submitConfirmation')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
