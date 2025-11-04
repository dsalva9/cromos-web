'use client';

import { useState, useMemo } from 'react';
import { SlotTile } from '@/components/templates/SlotTile';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSlotListings } from '@/hooks/templates/useSlotListings';
import { CheckCircle2 } from 'lucide-react';

interface SlotProgress {
  slot_id: string;
  page_id: string;
  page_number: number;
  slot_number: number;
  slot_variant: string | null;
  global_number: number | null;
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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isCompletingPage, setIsCompletingPage] = useState(false);
  const { slotListings, loading: listingsLoading } = useSlotListings(copyId);

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

    return groups;
  }, [progress]);

  const pageNumbers = Object.keys(pageGroups)
    .map(Number)
    .sort((a, b) => a - b);

  const handleCompleteAllPage = async () => {
    setIsCompletingPage(true);
    try {
      const slotsToUpdate = pageGroups[selectedPage].filter(
        slot => slot.status === 'missing'
      );

      // Update all missing slots to owned (count 1)
      await Promise.all(
        slotsToUpdate.map(slot => onUpdateSlot(slot.slot_id, 'owned', 1))
      );

      setConfirmDialogOpen(false);
    } catch (error) {
      console.error('Error completing page:', error);
    } finally {
      setIsCompletingPage(false);
    }
  };

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
            listing={slotListings[slot.slot_id]}
            listingsLoading={listingsLoading}
          />
        ))}
      </div>

      {/* Complete All Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={() => setConfirmDialogOpen(true)}
          variant="outline"
          className="border-2 border-[#FFC000] text-[#FFC000] hover:bg-[#FFC000] hover:text-black"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Completar toda la página
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-[#1F2937] text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Completar toda la página</DialogTitle>
            <DialogDescription className="text-gray-400">
              ¿Quieres marcar toda la página como completada?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-gray-300">
            Los cromos que ya tengas (Tengo o Repes) no se modificarán. Solo se marcarán como "Tengo" (count 1) aquellos que estén marcados como "Falta" (count 0).
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isCompletingPage}
              className="border-gray-600 text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteAllPage}
              disabled={isCompletingPage}
              className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
            >
              {isCompletingPage ? 'Completando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
