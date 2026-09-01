'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { SlotTile, SlotProgress as TileSlotProgress } from '@/components/templates/SlotTile';
import { SlotTradeDrawer } from '@/components/templates/SlotTradeDrawer';
import { TemplateFilter } from '@/components/templates/TemplateSummaryHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSlotListings } from '@/hooks/templates/useSlotListings';
import { Check, X, Copy as CopyIcon, CheckCircle2, LayoutGrid } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';
import { triggerInAppReview } from '@/lib/inAppReview';

interface SlotProgress {
  slot_id: number;
  page_id: number;
  page_number: number;
  page_title: string;
  slot_number: number;
  slot_variant: string | null;
  global_number: number | null;
  label: string | null;
  is_special: boolean;
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
  data?: Record<string, string | number | boolean> | null;
}

interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

interface TemplateProgressGridProps {
  progress: SlotProgress[];
  onUpdateSlot: (
    slotId: number,
    status: string,
    count: number
  ) => Promise<void>;
  onUpdateMultipleSlots?: (
    updates: { slotId: number; status: string; count: number }[]
  ) => Promise<void>;
  copyId: string;
  customFields?: CustomField[];
  marketplaceSlotIds?: Set<number>;
  dupeSlotIds?: Set<number>;
  templateId?: number;
  collectionId?: number;
  isAuthenticated?: boolean;
  activeFilter?: TemplateFilter;
  onFilterChange?: (filter: TemplateFilter) => void;
}

export function TemplateProgressGrid({
  progress,
  onUpdateSlot,
  onUpdateMultipleSlots,
  copyId,
  customFields = [],
  marketplaceSlotIds,
  dupeSlotIds,
  templateId,
  collectionId,
  isAuthenticated,
  activeFilter = 'all',
  onFilterChange,
}: TemplateProgressGridProps) {
  const t = useTranslations('templates.progressGrid');
  const tSummary = useTranslations('templates.summaryHeader');
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isCompletingPage, setIsCompletingPage] = useState(false);
  const [tradeDrawerSlot, setTradeDrawerSlot] = useState<TileSlotProgress | null>(null);
  const [tradeDrawerOpen, setTradeDrawerOpen] = useState(false);
  const { slotListings, loading: listingsLoading } = useSlotListings(copyId);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const handleOpenTradeDrawer = (slot: TileSlotProgress) => {
    setTradeDrawerSlot(slot);
    setTradeDrawerOpen(true);
  };

  // Auto-scroll active tab into view
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLElement>('[data-state="active"]');
    if (!activeBtn) return;
    activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedPage]);

  // Group slots by page and extract page titles
  const { pageGroups, pageTitles } = useMemo(() => {
    const groups = progress.reduce(
      (acc, slot) => {
        if (!acc[slot.page_number]) {
          acc[slot.page_number] = [];
        }
        acc[slot.page_number].push(slot);
        return acc;
      },
      {} as Record<number, SlotProgress[]>
    );

    // Extract page titles from first slot of each page
    const titles: Record<number, string> = {};
    Object.entries(groups).forEach(([pageNum, slots]) => {
      if (slots.length > 0) {
        titles[parseInt(pageNum)] = slots[0].page_title || t('pageFallback', { pageNum });
      }
    });

    // Sort slots within each page by slot_number, then variant
    Object.values(groups).forEach(slots => {
      slots.sort((a, b) => {
        if (a.slot_number !== b.slot_number) {
          return a.slot_number - b.slot_number;
        }
        // Sort variants: null first, then alphabetically
        return (a.slot_variant || '').localeCompare(b.slot_variant || '');
      });
    });

    return { pageGroups: groups, pageTitles: titles };
  }, [progress, t]);

  const pageNumbers = Object.keys(pageGroups)
    .map(Number)
    .sort((a, b) => a - b);

  const rawPageSlots = useMemo(
    () => pageGroups[selectedPage] || [],
    [pageGroups, selectedPage]
  );

  // Filter slots for current page based on activeFilter
  const pageFilteredSlots = useMemo(() => {
    if (activeFilter === 'all') return rawPageSlots;
    if (activeFilter === 'owned') {
      return rawPageSlots.filter(s => s.status === 'owned' || s.status === 'duplicate');
    }
    if (activeFilter === 'duplicate') {
      return rawPageSlots.filter(s => s.status === 'duplicate');
    }
    if (activeFilter === 'missing') {
      return rawPageSlots.filter(s => s.status === 'missing');
    }
    return rawPageSlots;
  }, [rawPageSlots, activeFilter]);

  const handleCompleteAllPage = async () => {
    setIsCompletingPage(true);
    try {
      const slotsToUpdate = pageGroups[selectedPage].filter(
        slot => slot.status === 'missing'
      );

      if (onUpdateMultipleSlots) {
        // Bulk update all missing slots in a single DB query
        await onUpdateMultipleSlots(
          slotsToUpdate.map(slot => ({
            slotId: slot.slot_id,
            status: 'owned',
            count: 0,
          }))
        );
      } else {
        // Fallback to sequential updates (instead of Promise.all) to prevent connection pool exhaustion
        for (const slot of slotsToUpdate) {
          await onUpdateSlot(slot.slot_id, 'owned', 0);
        }
      }

      setConfirmDialogOpen(false);
      void triggerInAppReview('template_page_completed');
    } catch (error) {
      logger.error('Error completing page:', error);
    } finally {
      setIsCompletingPage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Tabs */}
      <div
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 shadow-sm relative"
        >
        <Tabs
          value={selectedPage.toString()}
          onValueChange={v => setSelectedPage(Number(v))}
          className="w-full"
        >
          {/* Scrollable tabs container with edge-fade masks */}
          <div
            ref={tabsContainerRef}
            className="overflow-x-auto scrollbar-hide"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 24px, black calc(100% - 24px), transparent 100%)',
            }}
          >
            <TabsList className="w-max flex h-auto bg-transparent gap-2 justify-start p-0 px-1">
              {pageNumbers.map(pageNum => (
                <TabsTrigger
                  key={pageNum}
                  value={pageNum.toString()}
                  className="
                    flex-shrink-0
                    data-[state=active]:bg-gold
                    data-[state=active]:text-black
                    data-[state=active]:font-bold
                    text-gray-500 dark:text-gray-400
                    hover:text-black dark:hover:text-white
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    border border-transparent
                    data-[state=active]:border-gold
                    rounded-lg px-3 py-2 text-xs sm:text-sm sm:px-4
                    transition-all duration-200
                    max-w-[160px] sm:max-w-[200px]
                    overflow-hidden text-ellipsis whitespace-nowrap
                  "
                  title={pageTitles[pageNum]}
                >
                  {pageTitles[pageNum]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Active Filter Banner */}
      {activeFilter !== 'all' && (
        <div className={`flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
          activeFilter === 'owned'
            ? 'bg-green-50/90 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-950 dark:text-green-200'
            : activeFilter === 'duplicate'
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
              : 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-950 dark:text-red-200'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 ${
              activeFilter === 'owned'
                ? 'bg-green-600 text-white dark:bg-green-500 dark:text-black'
                : activeFilter === 'duplicate'
                  ? 'bg-amber-500 text-black dark:bg-gold dark:text-black'
                  : 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
            }`}>
              {activeFilter === 'owned' && <Check className="w-4 h-4" />}
              {activeFilter === 'duplicate' && <CopyIcon className="w-4 h-4" />}
              {activeFilter === 'missing' && <X className="w-4 h-4" />}
            </div>
            <div className="text-sm min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs uppercase tracking-wider opacity-80">
                  {t('filterActive')}:
                </span>
                <span className="font-black text-sm">
                  {activeFilter === 'owned' ? tSummary('stats.owned') : activeFilter === 'duplicate' ? tSummary('stats.duplicates') : tSummary('stats.missing')}
                </span>
              </div>
              <p className="text-xs opacity-75 mt-0.5">
                {t('filterShowing')} <strong>{pageFilteredSlots.length}</strong> {t('filterOfTotal', { total: rawPageSlots.length })}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onFilterChange?.('all')}
            className={`h-8 px-3 text-xs font-bold shrink-0 border rounded-lg transition-colors ${
              activeFilter === 'owned'
                ? 'border-green-300 dark:border-green-700 bg-white/80 dark:bg-green-900/50 hover:bg-green-100 dark:hover:bg-green-900 text-green-800 dark:text-green-200'
                : activeFilter === 'duplicate'
                  ? 'border-amber-300 dark:border-amber-700 bg-white/80 dark:bg-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200'
                  : 'border-red-300 dark:border-red-700 bg-white/80 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900 text-red-800 dark:text-red-200'
            }`}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            {t('clearFilter')}
          </Button>
        </div>
      )}

      {/* Grid Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <LayoutGrid className="w-5 h-5 text-gray-400" />
          <span className="font-bold">
            {activeFilter !== 'all'
              ? t('stickersFilteredOf', {
                  pageTitle: pageTitles[selectedPage] || t('pageFallback', { pageNum: selectedPage }),
                  filtered: pageFilteredSlots.length,
                  total: rawPageSlots.length,
                })
              : t('stickersOf', { pageTitle: pageTitles[selectedPage] || t('pageFallback', { pageNum: selectedPage }) })
            }
          </span>
        </div>

        {rawPageSlots.some(s => s.status === 'missing') && (
          <Button
            onClick={() => setConfirmDialogOpen(true)}
            variant="outline"
            className="
              border-gold text-gold 
              hover:bg-gold hover:text-black
              transition-all duration-300
              font-bold
            "
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t('completePageBtn')}
          </Button>
        )}
      </div>

      {/* Grid or Empty Filtered State */}
      {pageFilteredSlots.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pageFilteredSlots.map(slot => (
            <SlotTile
              key={slot.slot_id}
              slot={slot}
              onUpdate={onUpdateSlot}
              copyId={copyId}
              listing={slotListings[slot.slot_id]}
              listingsLoading={listingsLoading}
              customFields={customFields}
              inMarketplace={marketplaceSlotIds?.has(slot.slot_id) ?? false}
              hasUsersWithDupe={dupeSlotIds?.has(slot.slot_id) ?? false}
              onOpenTradeDrawer={handleOpenTradeDrawer}
              templateId={templateId}
              collectionId={collectionId}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      ) : (
        <div className="py-14 px-4 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
            activeFilter === 'missing'
              ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'
              : activeFilter === 'duplicate'
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                : activeFilter === 'owned'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
          }`}>
            {activeFilter === 'missing' && <CheckCircle2 className="w-7 h-7" />}
            {activeFilter === 'duplicate' && <CopyIcon className="w-7 h-7" />}
            {activeFilter === 'owned' && <LayoutGrid className="w-7 h-7" />}
            {activeFilter === 'all' && <LayoutGrid className="w-7 h-7" />}
          </div>
          <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1">
            {activeFilter === 'missing'
              ? t('emptyMissingTitle')
              : activeFilter === 'duplicate'
                ? t('emptyDuplicatesTitle')
                : activeFilter === 'owned'
                  ? t('emptyOwnedTitle')
                  : t('emptyFilterTitle')}
          </h4>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mb-5">
            {activeFilter === 'missing'
              ? t('emptyMissingDesc', { pageTitle: pageTitles[selectedPage] || t('pageFallback', { pageNum: selectedPage }) })
              : activeFilter === 'duplicate'
                ? t('emptyDuplicatesDesc', { pageTitle: pageTitles[selectedPage] || t('pageFallback', { pageNum: selectedPage }) })
                : activeFilter === 'owned'
                  ? t('emptyOwnedDesc', { pageTitle: pageTitles[selectedPage] || t('pageFallback', { pageNum: selectedPage }) })
                  : t('emptyFilterDesc', { pageTitle: pageTitles[selectedPage] || t('pageFallback', { pageNum: selectedPage }) })}
          </p>
          {activeFilter !== 'all' && (
            <Button
              variant="outline"
              onClick={() => onFilterChange?.('all')}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-xs"
            >
              {t('showAllStickers')}
            </Button>
          )}
        </div>
      )}

      {/* Slot Trade Drawer */}
      <SlotTradeDrawer
        open={tradeDrawerOpen}
        onOpenChange={setTradeDrawerOpen}
        slot={tradeDrawerSlot}
        copyId={copyId}
        templateId={templateId}
      />

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="text-gold" />
              {t('completePageTitle')}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400 pt-2">
              {t('completePageDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
            <p>{t('thisAction')}</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-400">
              <li>{t.rich('markAsOwned', { ownedTag: (chunks) => <strong>{chunks}</strong> })}</li>
              <li>{t('wontModify')}</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isCompletingPage}
              className="border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCompleteAllPage}
              disabled={isCompletingPage}
              className="bg-gold text-black hover:bg-gold-light font-bold"
            >
              {isCompletingPage ? t('completing') : t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
