'use client';

import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { TradeProposalItem } from '@/types';

interface ProposalSummaryProps {
  offerItems: TradeProposalItem[];
  requestItems: TradeProposalItem[];
  targetUserNickname: string;
  message: string;
  onMessageChange: (message: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
}

/**
 * A summary card for the trade proposal being composed.
 * It shows item counts, provides a message input, and a submission button.
 */
export function ProposalSummary({
  offerItems,
  requestItems,
  targetUserNickname,
  message,
  onMessageChange,
  onSubmit,
  loading,
  disabled,
}: ProposalSummaryProps) {
  const offerCount = offerItems.reduce((sum, item) => sum + item.quantity, 0);
  const requestCount = requestItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const MAX_MESSAGE_LENGTH = 500;

  return (
    <ModernCard className="bg-white dark:bg-gray-800 border-2 border-black shadow-xl">
      <div className="p-6 pb-0">
        <h2 className="text-lg font-bold uppercase text-gray-900 dark:text-white">Resumen de la Propuesta</h2>
      </div>
      <ModernCardContent className="space-y-6 p-6">
        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border-2 border-black">
            <p className="font-bold text-gray-900 dark:text-white uppercase">Tu Oferta:</p>
            <p className="font-bold text-[#FFC000]">
              {offerCount} cromo{offerCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border-2 border-black">
            <p className="font-bold text-gray-900 dark:text-white uppercase">
              Tu Pedido a {targetUserNickname}:
            </p>
            <p className="font-bold text-[#FFC000]">
              {requestCount} cromo{requestCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div>
          <Textarea
            placeholder="Añade un mensaje (opcional)..."
            value={message}
            onChange={e => onMessageChange(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            className="bg-gray-50 border-2 border-black text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-[#FFC000]"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-right font-bold">
            {message.length} / {MAX_MESSAGE_LENGTH}
          </p>
        </div>

        <Button
          onClick={onSubmit}
          disabled={disabled || loading}
          size="lg"
          className="w-full bg-[#FFC000] hover:bg-yellow-500 text-gray-900 border-2 border-black font-bold uppercase shadow-xl"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Enviando...' : 'Enviar Propuesta'}
        </Button>
      </ModernCardContent>
    </ModernCard>
  );
}
