'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Info, ArrowLeft, MoreVertical, Flag, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useMatchChat } from '@/hooks/chats/useMatchChat';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { MatchInfoModal } from './MatchInfoModal';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';
import { useIgnore } from '@/hooks/social/useIgnore';
import { useReport } from '@/hooks/social/useReport';
import { toast } from '@/lib/toast';

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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
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

              <div ref={messagesEndRef} />
            </>
          )}
        </div>



        {/* ---- Composer ---- */}
        <ChatComposer
          onSend={sendMessage}
          sending={sending}
          uploading={uploading}
          disabled={!conversationId}
        />
      </div>

      {/* ---- Info modal ---- */}
      <MatchInfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        otherNickname={otherNickname}
        collectionTitle={collectionTitle}
        theyHaveCount={theyHaveCount}
        youHaveCount={youHaveCount}
        distanceKm={distanceKm}
        templateId={templateId}
        otherUserId={otherUserId}
        conversationId={conversationId}
      />
    </>
  );
}
