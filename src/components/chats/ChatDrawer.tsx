'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Info, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useMatchChat } from '@/hooks/chats/useMatchChat';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { MatchInfoModal } from './MatchInfoModal';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';

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
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
      {/* Overlay — desktop only (sidebar-style on desktop) */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:bg-black/20"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-white dark:bg-gray-900',
          // Mobile: full screen
          'inset-0',
          // Desktop: right side drawer
          'sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:border-l sm:border-gray-200 sm:dark:border-gray-700 sm:shadow-2xl'
        )}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          {/* Back button (mobile) */}
          <button
            onClick={onClose}
            className="sm:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
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

          {/* Name + collection */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate text-sm">
              {otherNickname}
            </p>
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

          {/* Close button (desktop) */}
          <button
            onClick={onClose}
            className="hidden sm:block text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
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

        {/* ---- Propose trade bar ---- */}
        {templateId && otherUserId && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <Link
              href={`/intercambios/componer?partner=${otherUserId}&template=${templateId}`}
              className="flex items-center justify-center gap-2 text-xs font-bold text-gold hover:text-yellow-500 transition-colors py-1"
            >
              {t('proposeTrade')}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

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
      />
    </>
  );
}
