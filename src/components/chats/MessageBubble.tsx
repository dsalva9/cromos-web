'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageModal } from '@/components/ui/ImageModal';
import type { MatchChatMessage } from '@/lib/supabase/matches/chat';
import { FileText, Download, Coffee } from 'lucide-react';
import { downloadFile } from '@/lib/validations/chat';
import { useTranslations } from 'next-intl';

function BmacChatPrompt() {
  const t = useTranslations('marketplace.chat.bmac');

  return (
    <div className="flex justify-center my-4 w-full">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 shadow-sm max-w-[85%] sm:max-w-[70%] text-center flex flex-col items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Coffee className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h4 className="text-sm font-black text-amber-900 dark:text-amber-300">
            {t('title')}
          </h4>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
        <a
          href="https://buymeacoffee.com/cambiocromos"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 bg-[#FF9900] hover:bg-[#E68A00] text-white font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
        >
          <span>{t('cta')}</span>
        </a>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: MatchChatMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  // System messages
  if (message.is_system) {
    let isBmacPrompt = false;
    try {
      const parsed = JSON.parse(message.message);
      if (parsed?.type === 'bmac_prompt') {
        isBmacPrompt = true;
      }
    } catch {}

    if (isBmacPrompt) {
      return <BmacChatPrompt />;
    }

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
  const isPdf = !!message.image_url?.endsWith('.pdf');
  const isPdfOnly = isPdf && message.message === '📄 PDF';
  const isImageOnly = hasImage && !isPdf && message.message === '📷 Imagen';

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
          {/* File attachment */}
          {hasImage && (
            isPdf ? (
              /* PDF document card */
              <button
                onClick={() => void downloadFile(message.image_url!, 'documento.pdf')}
                type="button"
                className="flex items-center gap-3 p-3 mb-1 rounded-lg bg-white/20 dark:bg-black/20 border border-black/10 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 transition-colors text-left w-full text-current"
              >
                <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Documento PDF</p>
                  <p className="text-xs opacity-60">Toca para descargar</p>
                </div>
                <Download className="w-4 h-4 opacity-60 flex-shrink-0" />
              </button>
            ) : (
              /* Image */
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
            )
          )}

          {/* Text */}
          {!isImageOnly && !isPdfOnly && (
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
      {hasImage && !isPdf && (
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
