'use client';

import { useState, useRef, useEffect } from 'react';
import { useTradeChat } from '@/hooks/trades/useTradeChat';
import { useUser } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ChevronDown, Loader2, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { ReportButton } from '@/components/social/ReportButton';

interface TradeChatPanelProps {
  tradeId: number | null;
  counterpartyNickname: string;
  counterpartyId?: string;
  isProposalActive: boolean; // true if proposal is pending/accepted, false if cancelled/rejected
}

export function TradeChatPanel({
  tradeId,
  counterpartyNickname,
  counterpartyId,
  isProposalActive,
}: TradeChatPanelProps) {
  const { user } = useUser();
  const {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
  } = useTradeChat({
    tradeId,
    enabled: !!tradeId,
  });

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageCountRef = useRef(0);

  // Auto-scroll to bottom on initial load or new message (only if not scrolled up)
  useEffect(() => {
    if (messages.length === 0) return;

    // If this is the first load or user is at bottom
    if (!isUserScrolledUp || lastMessageCountRef.current === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowNewMessagesPill(false);
    } else if (messages.length > lastMessageCountRef.current) {
      // New message arrived while user scrolled up
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_id !== user?.id) {
        setShowNewMessagesPill(true);
      }
    }

    lastMessageCountRef.current = messages.length;
  }, [messages, isUserScrolledUp, user?.id]);

  // Mark as read immediately when panel is opened with a tradeId
  useEffect(() => {
    if (tradeId) {
      markAsRead();
    }
  }, [tradeId, markAsRead]);

  // Handle scroll detection
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;

    setIsUserScrolledUp(!isAtBottom);

    if (isAtBottom) {
      setShowNewMessagesPill(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sending || !isProposalActive) return;

    setSending(true);
    try {
      await sendMessage(messageText);
      setMessageText('');
      // Refocus the textarea after sending
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } catch (err) {
      logger.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessagesPill(false);
  };

  const remainingChars = 500 - messageText.length;

  if (!tradeId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 font-bold">
        Selecciona una propuesta para ver el chat
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-900 rounded-lg border-2 border-black shadow-xl">
      {/* Messages area with fixed height and scroll */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 relative min-h-0"
      >
        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={loading}
              className="bg-gray-800 border-2 border-black hover:bg-gray-700 text-white font-bold uppercase text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Ver mensajes anteriores'
              )}
            </Button>
          </div>
        )}

        {/* Loading state */}
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-[#FFC000]" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center text-[#E84D4D] font-bold p-4 bg-gray-800 rounded-md border-2 border-black">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-32 text-gray-400 font-bold text-center px-4">
            Aún no hay mensajes en esta propuesta.
            <br />
            ¡Sé el primero en saludar!
          </div>
        )}

        {/* Messages */}
        {messages.map(message => {
          const isMine = message.sender_id === user?.id;
          return (
            <div
              key={message.id}
              className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-lg p-3 border-2 border-black shadow-md',
                  isMine
                    ? 'bg-[#FFC000] text-gray-900'
                    : 'bg-gray-800 text-white'
                )}
              >
                {!isMine && (
                  <p className="text-xs font-bold text-gray-400 mb-1">
                    {message.sender_nickname}
                  </p>
                )}
                <p className="text-sm font-medium whitespace-pre-wrap break-words">
                  {message.message}
                </p>
                <p
                  className={cn(
                    'text-xs mt-1',
                    isMine ? 'text-gray-700' : 'text-gray-500'
                  )}
                >
                  {new Date(message.created_at).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* New messages pill */}
      {showNewMessagesPill && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
          <Button
            size="sm"
            onClick={scrollToBottom}
            className="bg-[#FFC000] hover:bg-[#FFD633] text-gray-900 border-2 border-black font-bold uppercase shadow-lg"
          >
            <ChevronDown className="mr-1 h-4 w-4" />
            Nuevos mensajes
          </Button>
        </div>
      )}

      {/* Composer - fixed height, no scroll */}
      <div className="border-t-2 border-black p-4 bg-gray-800 flex-shrink-0">
        <div className="flex flex-col space-y-2">
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isProposalActive
                ? `Mensaje para ${counterpartyNickname}…`
                : 'Esta propuesta está cerrada'
            }
            disabled={!isProposalActive || sending}
            maxLength={500}
            rows={2}
            className="resize-none bg-gray-900 text-white border-2 border-black font-medium placeholder:text-gray-500"
          />
          <div className="flex justify-between items-center">
            <span
              className={cn(
                'text-xs font-bold',
                remainingChars < 50 ? 'text-[#E84D4D]' : 'text-gray-400'
              )}
            >
              {remainingChars} caracteres restantes
            </span>
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending || !isProposalActive}
              className="bg-[#FFC000] hover:bg-[#FFD633] text-gray-900 border-2 border-black font-bold uppercase disabled:opacity-50"
              size="sm"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
