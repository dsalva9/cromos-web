'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useListingChat } from '@/hooks/marketplace/useListingChat';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

function ListingChatPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const listingId = parseInt(params.id as string, 10);

  const [messageText, setMessageText] = useState('');
  const [listingOwner, setListingOwner] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  const {
    messages,
    participants,
    loading,
    sending,
    sendMessage,
    fetchParticipants,
    messagesEndRef,
  } = useListingChat({
    listingId,
    participantId: selectedParticipant || undefined,
  });

  // Fetch listing owner
  useEffect(() => {
    async function fetchListing() {
      const { data } = await supabase
        .from('trade_listings')
        .select('user_id')
        .eq('id', listingId)
        .single();

      if (data) {
        setListingOwner(data.user_id);
        setIsOwner(user?.id === data.user_id);
      }
    }

    void fetchListing();
  }, [supabase, listingId, user]);

  // Fetch participants if owner
  useEffect(() => {
    if (isOwner) {
      void fetchParticipants();
    }
  }, [isOwner, fetchParticipants]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;

    const receiverId = isOwner
      ? selectedParticipant || undefined
      : listingOwner || undefined;

    await sendMessage(messageText, receiverId);
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937] py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/marketplace/${listingId}`)}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al anuncio
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Participants sidebar (seller only) */}
          {isOwner && participants.length > 0 && (
            <div className="md:col-span-1">
              <ModernCard>
                <ModernCardContent className="p-4">
                  <h3 className="font-bold text-white mb-3">Conversaciones</h3>
                  <div className="space-y-2">
                    {participants.map(participant => (
                      <button
                        key={participant.user_id}
                        onClick={() => setSelectedParticipant(participant.user_id)}
                        className={cn(
                          'w-full text-left p-3 rounded-md transition-colors',
                          selectedParticipant === participant.user_id
                            ? 'bg-[#FFC000]/20 border-2 border-[#FFC000]'
                            : 'bg-gray-800 hover:bg-gray-700 border-2 border-transparent'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            {participant.nickname}
                          </span>
                          {participant.unread_count > 0 && (
                            <span className="bg-[#FFC000] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                              {participant.unread_count}
                            </span>
                          )}
                        </div>
                        {participant.last_message && (
                          <p className="text-sm text-gray-400 truncate mt-1">
                            {participant.last_message}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </ModernCardContent>
              </ModernCard>
            </div>
          )}

          {/* Chat panel */}
          <div className={cn(isOwner && participants.length > 0 ? 'md:col-span-2' : 'md:col-span-3')}>
            <ModernCard>
              <ModernCardContent className="p-0">
                {/* Messages */}
                <div className="h-[500px] overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">
                        {isOwner
                          ? 'No hay conversaciones aún'
                          : 'Envía un mensaje para iniciar la conversación'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map(message => {
                        const isOwnMessage = message.sender_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'flex',
                              isOwnMessage ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg p-3 border-2 border-black',
                                isOwnMessage
                                  ? 'bg-[#FFC000] text-black'
                                  : 'bg-gray-800 text-white'
                              )}
                            >
                              {!isOwnMessage && (
                                <p className="text-xs font-bold mb-1 opacity-70">
                                  {message.sender_nickname}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words">
                                {message.message}
                              </p>
                              <p className="text-xs mt-1 opacity-60">
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
                    </>
                  )}
                </div>

                {/* Composer */}
                <div className="border-t-2 border-gray-700 p-4">
                  {isOwner && !selectedParticipant && participants.length > 0 ? (
                    <p className="text-gray-400 text-center">
                      Selecciona una conversación para responder
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <textarea
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        maxLength={500}
                        rows={2}
                        className="flex-1 bg-gray-800 text-white rounded-md px-4 py-2 border-2 border-gray-700 focus:border-[#FFC000] focus:outline-none resize-none"
                        disabled={sending}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!messageText.trim() || sending}
                        className="bg-[#FFC000] text-black hover:bg-yellow-400 font-bold"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {messageText.length}/500 caracteres
                  </p>
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListingChatPage() {
  return (
    <AuthGuard>
      <ListingChatPageContent />
    </AuthGuard>
  );
}
