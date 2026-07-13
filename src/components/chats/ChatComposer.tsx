'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { toast } from '@/lib/toast';

interface ChatComposerProps {
  onSend: (text: string, imageFile?: File | Blob | null) => Promise<void>;
  sending: boolean;
  uploading: boolean;
  disabled?: boolean;
  onManualConfirm?: () => void;
  showConfirmButton?: boolean;
}

export function ChatComposer({
  onSend,
  sending,
  uploading,
  disabled,
  onManualConfirm,
  showConfirmButton,
}: ChatComposerProps) {
  const t = useTranslations('matchChat');
  const t_tc = useTranslations('tradeConfirmations');
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if ((!text.trim() && !pendingFile) || sending || uploading) return;

    await onSend(text, pendingFile);
    setText('');
    setPendingFile(null);

    // Refocus textarea
    textareaRef.current?.focus();
  }, [text, pendingFile, onSend, sending, uploading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate PDF size limit (2MB)
      if (file.type === 'application/pdf' && file.size > 2 * 1024 * 1024) {
        toast.error('El archivo PDF no puede superar los 2MB');
        e.target.value = '';
        return;
      }
      setPendingFile(file);
    }
    // Reset so same file can be re-selected
    e.target.value = '';
  }, []);

  const autoGrow = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    setText(el.value);
  }, []);

  const isBusy = sending || uploading;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex items-center justify-center">
            {pendingFile.type === 'application/pdf' ? (
              <FileText className="w-6 h-6 text-red-500" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={URL.createObjectURL(pendingFile)}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <span className="text-xs text-gray-500 truncate flex-1">{pendingFile.name}</span>
          <button
            onClick={() => setPendingFile(null)}
            className="text-gray-400 hover:text-red-500 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 mb-2 px-1 text-xs text-gold">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t('uploadingFile')}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-gray-500 hover:text-gold"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy || disabled}
          title={t('attachFile')}
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {/* Manual confirmation trigger button */}
        {showConfirmButton && onManualConfirm && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 text-gray-500 hover:text-gold transition-colors"
            onClick={onManualConfirm}
            disabled={isBusy || disabled}
            title={t_tc('manualButton')}
            aria-label={t_tc('manualButton')}
          >
            <span className="text-lg">📬</span>
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          rows={1}
          maxLength={2000}
          disabled={isBusy || disabled}
          className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold disabled:opacity-50"
          style={{ minHeight: '36px', maxHeight: '120px' }}
        />

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 flex-shrink-0 bg-gold hover:bg-yellow-400 text-black rounded-full"
          onClick={() => void handleSend()}
          disabled={isBusy || disabled || (!text.trim() && !pendingFile)}
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
