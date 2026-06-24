'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';

export interface TradeStickerExtended {
  sticker_id: number;
  sticker_code: string;
  player_name: string;
  team_name: string;
  rarity: string;
  count: number;
  slot_number: number | null;
  global_number: number | null;
}

interface TradeBuilderProps {
  theyOffer: TradeStickerExtended[];
  iOffer: TradeStickerExtended[];
  targetUserNickname: string;
  onSubmit: (messages: string[]) => Promise<void>;
  submitting: boolean;
}

function formatStickerLine(sticker: TradeStickerExtended): string {
  const numberVal = sticker.slot_number ?? sticker.global_number;
  const label = sticker.player_name || sticker.sticker_code || '';
  const hasTeamName = !!sticker.team_name && sticker.team_name.trim() !== '';

  const parts: string[] = [];

  if (hasTeamName) {
    parts.push(sticker.team_name.trim());
  }

  if (numberVal !== null && numberVal !== undefined) {
    parts.push(`#${numberVal}`);
  }

  // If team name is identical to label, avoid repeating
  if (!hasTeamName || sticker.team_name.trim().toLowerCase() !== label.trim().toLowerCase()) {
    if (label) {
      parts.push(label.trim());
    }
  }

  return `- ${parts.join(' ')}`;
}

interface BuilderListProps {
  stickers: TradeStickerExtended[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  title: string;
  icon: React.ReactNode;
  headerColor: string;
}

function BuilderList({
  stickers,
  selectedIds,
  onToggle,
  title,
  icon,
  headerColor,
}: BuilderListProps) {
  if (stickers.length === 0) return null;

  return (
    <ModernCard className="bg-white dark:bg-gray-800 border-2 border-black shadow-xl overflow-hidden w-full max-w-full">
      <div className={`${headerColor} px-3 py-2.5 sm:p-4 rounded-t-md border-b-2 border-black`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0">{icon}</span>
          <h3 className="text-xs sm:text-base font-bold uppercase text-white flex-1 min-w-0 truncate">
            {title}
          </h3>
          <span className="bg-gray-50 border-2 border-black text-gray-900 text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0">
            {selectedIds.size}/{stickers.length}
          </span>
        </div>
      </div>

      <ModernCardContent className="p-0">
        <div className="max-h-60 sm:max-h-96 overflow-y-auto overflow-x-hidden">
          {stickers.map((sticker) => {
            const isChecked = selectedIds.has(sticker.sticker_id);
            return (
              <div
                key={sticker.sticker_id}
                onClick={() => onToggle(sticker.sticker_id)}
                className="flex items-start gap-3 px-3 py-2.5 sm:p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors select-none"
              >
                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggle(sticker.sticker_id)}
                    className="border-black dark:border-white"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-xs font-mono text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded border border-black/30 font-bold truncate min-w-0">
                      #{sticker.sticker_code}
                    </span>
                    {sticker.count > 1 && (
                      <span className="text-[10px] font-black text-gold ml-auto">
                        x{sticker.count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate mt-0.5">
                    {sticker.player_name}
                    {sticker.team_name && (
                      <span className="text-gray-400 dark:text-gray-500">
                        {' '}
                        · {sticker.team_name}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}

export function TradeBuilder({
  theyOffer,
  iOffer,
  targetUserNickname,
  onSubmit,
  submitting,
}: TradeBuilderProps) {
  const t = useTranslations('matchChat.tradeBuilder');

  // Pre-check all by default
  const [selectedTheyOffer, setSelectedTheyOffer] = useState<Set<number>>(
    () => new Set(theyOffer.map((s) => s.sticker_id))
  );
  const [selectedIOffer, setSelectedIOffer] = useState<Set<number>>(
    () => new Set(iOffer.map((s) => s.sticker_id))
  );

  const toggleTheyOffer = (id: number) => {
    setSelectedTheyOffer((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleIOffer = (id: number) => {
    setSelectedIOffer((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Generate message & split logic
  const { messages, fullMessageText } = useMemo(() => {
    const selectedTheyOfferStickers = theyOffer.filter((s) =>
      selectedTheyOffer.has(s.sticker_id)
    );
    const selectedIOfferStickers = iOffer.filter((s) =>
      selectedIOffer.has(s.sticker_id)
    );

    const header = t('tradeProposalHeader');
    const offerSectionHeader = t('iOfferYou');
    const requestSectionHeader = t('youGiveMe');

    const offerLines = selectedIOfferStickers
      .map((s) => formatStickerLine(s))
      .join('\n');
    const requestLines = selectedTheyOfferStickers
      .map((s) => formatStickerLine(s))
      .join('\n');

    const fullText = `${header}\n\n${offerSectionHeader}\n${offerLines}\n\n${requestSectionHeader}\n${requestLines}`;

    let msgs: string[] = [];
    if (fullText.length <= 2000) {
      msgs = [fullText];
    } else {
      // Split into 2 messages
      const msg1 = `${header}\n\n${offerSectionHeader}\n${offerLines}`;
      const msg2 = `${requestSectionHeader}\n${requestLines}`;
      msgs = [msg1, msg2];
    }

    return { messages: msgs, fullMessageText: fullText };
  }, [theyOffer, iOffer, selectedTheyOffer, selectedIOffer, t]);

  const willSplit = fullMessageText.length > 2000;
  const isSubmitDisabled =
    selectedTheyOffer.size === 0 || selectedIOffer.size === 0 || submitting;

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    await onSubmit(messages);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 overflow-hidden w-full max-w-full">
        {theyOffer.length > 0 && (
          <BuilderList
            stickers={theyOffer}
            selectedIds={selectedTheyOffer}
            onToggle={toggleTheyOffer}
            title={t('theyOfferTitle', { nickname: targetUserNickname })}
            icon={<ArrowDown className="w-5 h-5 text-white" />}
            headerColor="bg-gradient-to-r from-green-500 to-green-600"
          />
        )}

        {iOffer.length > 0 && (
          <BuilderList
            stickers={iOffer}
            selectedIds={selectedIOffer}
            onToggle={toggleIOffer}
            title={t('youOfferTitle')}
            icon={<ArrowUp className="w-5 h-5 text-white" />}
            headerColor="bg-gradient-to-r from-blue-500 to-blue-600"
          />
        )}
      </div>

      <div className="space-y-2 mt-4">
        {willSplit && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded p-2 text-center font-semibold">
            ⚠️ {t('willSplitInfo')}
          </p>
        )}

        {isSubmitDisabled && !submitting && (
          <p className="text-xs text-red-600 dark:text-red-400 text-center font-semibold">
            {t('selectAtLeastOne')}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="w-full bg-gold hover:bg-yellow-400 text-gray-900 border-2 border-black font-black uppercase text-sm py-3 rounded-md shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          size="lg"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            t('offerTrade')
          )}
        </Button>
      </div>
    </div>
  );
}
