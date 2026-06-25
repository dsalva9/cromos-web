'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowDown, ArrowUp, Loader2, ChevronRight } from 'lucide-react';
import { cleanPlayerName } from '@/utils/cleanPlayerName';

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
  const label = cleanPlayerName(sticker.player_name || sticker.sticker_code || '', sticker.team_name);
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

interface PageGroup {
  pageName: string;
  stickers: TradeStickerExtended[];
}

interface BuilderListProps {
  stickers: TradeStickerExtended[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onTogglePage: (stickerIds: number[], forceCheck: boolean) => void;
  onUncheckAll: () => void;
  title: string;
  icon: React.ReactNode;
  headerColor: string;
  uncheckAllLabel: string;
}

function BuilderList({
  stickers,
  selectedIds,
  onToggle,
  onTogglePage,
  onUncheckAll,
  title,
  icon,
  headerColor,
  uncheckAllLabel,
}: BuilderListProps) {
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});

  const pageGroups = useMemo(() => {
    const groups: PageGroup[] = [];
    const map = new Map<string, TradeStickerExtended[]>();
    for (const s of stickers) {
      const pageName = s.team_name || 'Sin Página';
      if (!map.has(pageName)) {
        map.set(pageName, []);
        groups.push({ pageName, stickers: map.get(pageName)! });
      }
      map.get(pageName)!.push(s);
    }
    return groups;
  }, [stickers]);

  const togglePage = (pageName: string) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pageName]: !prev[pageName],
    }));
  };

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
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUncheckAll();
              }}
              className="text-[10px] sm:text-xs font-semibold text-white/90 underline hover:text-white transition-colors ml-2 flex-shrink-0"
            >
              {uncheckAllLabel}
            </button>
          )}
        </div>
      </div>

      <ModernCardContent className="p-0">
        <div className="max-h-60 sm:max-h-[30rem] overflow-y-auto overflow-x-hidden divide-y divide-gray-200 dark:divide-gray-700">
          {pageGroups.map((pageGroup) => {
            const pageStickerIds = pageGroup.stickers.map((s) => s.sticker_id);
            const checkedCount = pageStickerIds.filter((id) =>
              selectedIds.has(id)
            ).length;
            const isAllChecked = checkedCount === pageGroup.stickers.length;
            const isPartiallyChecked =
              checkedCount > 0 && checkedCount < pageGroup.stickers.length;
            const isExpanded = !!expandedPages[pageGroup.pageName];

            return (
              <div key={pageGroup.pageName} className="flex flex-col">
                {/* Page/Group Header Row */}
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 py-1 select-none"
                    onClick={() => togglePage(pageGroup.pageName)}
                  >
                    <span
                      className={`transform transition-transform duration-200 flex-shrink-0 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                      {pageGroup.pageName}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                      ({checkedCount}/{pageGroup.stickers.length})
                    </span>
                  </div>
                  <div className="flex items-center pr-1">
                    <Checkbox
                      checked={
                        isAllChecked
                          ? true
                          : isPartiallyChecked
                          ? 'indeterminate'
                          : false
                      }
                      onCheckedChange={() => {
                        onTogglePage(pageStickerIds, !isAllChecked);
                      }}
                      className="border-black dark:border-white"
                    />
                  </div>
                </div>

                {/* Nested Stickers List */}
                {isExpanded && (
                  <div className="bg-white dark:bg-gray-900/50 divide-y divide-gray-100 dark:divide-gray-850">
                    {pageGroup.stickers.map((sticker) => {
                      const isChecked = selectedIds.has(sticker.sticker_id);
                      return (
                        <div
                          key={sticker.sticker_id}
                          onClick={() => onToggle(sticker.sticker_id)}
                          className="flex items-start gap-3 pl-8 pr-3 py-2 sm:py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 cursor-pointer transition-colors select-none"
                        >
                          <div
                            className="pt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                              {cleanPlayerName(sticker.player_name, sticker.team_name)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

  // Start with everything unchecked (empty sets)
  const [selectedTheyOffer, setSelectedTheyOffer] = useState<Set<number>>(
    () => new Set()
  );
  const [selectedIOffer, setSelectedIOffer] = useState<Set<number>>(
    () => new Set()
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

  const toggleTheyOfferPage = (ids: number[], forceCheck: boolean) => {
    setSelectedTheyOffer((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (forceCheck) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  };

  const toggleIOfferPage = (ids: number[], forceCheck: boolean) => {
    setSelectedIOffer((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (forceCheck) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  };

  const uncheckAllTheyOffer = () => {
    setSelectedTheyOffer(new Set());
  };

  const uncheckAllIOffer = () => {
    setSelectedIOffer(new Set());
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
            onTogglePage={toggleTheyOfferPage}
            onUncheckAll={uncheckAllTheyOffer}
            title={t('theyOfferTitle', { nickname: targetUserNickname })}
            icon={<ArrowDown className="w-5 h-5 text-white" />}
            headerColor="bg-gradient-to-r from-green-500 to-green-600"
            uncheckAllLabel={t('uncheckAll')}
          />
        )}

        {iOffer.length > 0 && (
          <BuilderList
            stickers={iOffer}
            selectedIds={selectedIOffer}
            onToggle={toggleIOffer}
            onTogglePage={toggleIOfferPage}
            onUncheckAll={uncheckAllIOffer}
            title={t('youOfferTitle')}
            icon={<ArrowUp className="w-5 h-5 text-white" />}
            headerColor="bg-gradient-to-r from-blue-500 to-blue-600"
            uncheckAllLabel={t('uncheckAll')}
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
