'use client';

import { useState, useMemo } from 'react';
import { SlotTile } from '@/components/templates/SlotTile';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SlotProgress {
  slot_id: string;
  page_id: string;
  page_number: number;
  slot_number: number;
  label: string | null;
  is_special: boolean;
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
}

interface TemplateProgressGridProps {
  progress: SlotProgress[];
  onUpdateSlot: (
    slotId: string,
    status: string,
    count: number
  ) => Promise<void>;
  copyId: string;
}

export function TemplateProgressGrid({
  progress,
  onUpdateSlot,
  copyId,
}: TemplateProgressGridProps) {
  const [selectedPage, setSelectedPage] = useState<number>(1);

  // Group slots by page
  const pageGroups = useMemo(() => {
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

    // Sort slots within each page by slot_number
    Object.values(groups).forEach(slots => {
      slots.sort((a, b) => a.slot_number - b.slot_number);
    });

    return groups;
  }, [progress]);

  const pageNumbers = Object.keys(pageGroups)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Page Tabs */}
      <ModernCard>
        <ModernCardContent className="p-4">
          <Tabs
            value={selectedPage.toString()}
            onValueChange={v => setSelectedPage(Number(v))}
          >
            <TabsList className="w-full flex-wrap h-auto">
              {pageNumbers.map(pageNum => (
                <TabsTrigger
                  key={pageNum}
                  value={pageNum.toString()}
                  className="flex-1 min-w-[100px]"
                >
                  Página {pageNum}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ModernCardContent>
      </ModernCard>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {pageGroups[selectedPage]?.map(slot => (
          <SlotTile
            key={slot.slot_id}
            slot={slot}
            onUpdate={onUpdateSlot}
            copyId={copyId}
          />
        ))}
      </div>
    </div>
  );
}
