'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageModal } from '@/components/ui/ImageModal';
import type { MatchChatMessage } from '@/lib/supabase/matches/chat';

interface MessageBubbleProps {
  message: MatchChatMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  // System messages
  if (message.is_system) {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full max-w-[80%] text-center">
          {message.message}
        </span>
      </div>
    );
  }

  const time = new Date(message.created_at).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const hasImage = !!message.image_url;
  const isImageOnly = hasImage && message.message === '📷 Imagen';

  return (
    <>
      <div className={cn('flex mb-2', isOwn ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm',
            isOwn
              ? 'bg-gold/90 text-black rounded-br-md'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
          )}
        >
          {/* Image */}
          {hasImage && (
            <button
              onClick={() => setShowImageModal(true)}
              className="block mb-1 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Image
                src={message.thumbnail_url || message.image_url!}
                alt="Imagen adjunta"
                width={240}
                height={180}
                className="rounded-lg object-cover"
                unoptimized
              />
            </button>
          )}

          {/* Text */}
          {!isImageOnly && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.message}
            </p>
          )}

          {/* Timestamp */}
          <p
            className={cn(
              'text-[10px] mt-1 text-right',
              isOwn ? 'text-black/50' : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {time}
          </p>
        </div>
      </div>

      {/* Image lightbox */}
      {hasImage && (
        <ImageModal
          isOpen={showImageModal}
          imageUrl={message.image_url!}
          alt="Imagen del chat"
          onClose={() => setShowImageModal(false)}
        />
      )}
    </>
  );
}
