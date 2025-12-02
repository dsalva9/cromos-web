'use client';

import { useState, useMemo } from 'react';
import { SlotTile } from '@/components/templates/SlotTile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSlotListings } from '@/hooks/templates/useSlotListings';
import { CheckCircle2, LayoutGrid } from 'lucide-react';

interface SlotProgress {
  slot_id: string;
  page_id: string;
  page_number: number;
  page_title: string;
  slot_number: number;
  slot_variant: string | null;
  global_number: number | null;
  label: string | null;
  is_special: boolean;
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
  data?: Record<string, string | number | boolean>;
}

interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

interface TemplateProgressGridProps {
  progress: SlotProgress[];
  onUpdateSlot: (
    slotId: string,
    status: string,
    count: number
  ) => Promise<void>;
  copyId: string;
  customFields?: CustomField[];
}

export function TemplateProgressGrid({
  progress,
  onUpdateSlot,
  copyId,
  customFields = [],
}: TemplateProgressGridProps) {
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isCompletingPage, setIsCompletingPage] = useState(false);
  const { slotListings, loading: listingsLoading } = useSlotListings(copyId);

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
        titles[parseInt(pageNum)] = slots[0].page_title || `Página ${pageNum}`;
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
    <div className="space-y-8">
      {/* Page Tabs */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-2">
        <Tabs
          value={selectedPage.toString()}
          onValueChange={v => setSelectedPage(Number(v))}
          className="w-full"
        >
          <TabsList className="w-full flex-wrap h-auto bg-transparent gap-2 justify-start p-0">
            {pageNumbers.map(pageNum => (
              <TabsTrigger
                key={pageNum}
                value={pageNum.toString()}
                className="
                  data-[state=active]:bg-[#FFC000]
                  data-[state=active]:text-black
                  data-[state=active]:font-bold
                  text-gray-400
                  hover:text-white
                  hover:bg-gray-800
                  border border-transparent
                  data-[state=active]:border-[#FFC000]
                  rounded-lg px-4 py-2
                  transition-all duration-200
                  flex-1 min-w-[100px] md:flex-none
                "
                title={pageTitles[pageNum]}
              >
                {pageTitles[pageNum]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <LayoutGrid className="w-5 h-5" />
          <span className="font-medium">Cromos de {pageTitles[selectedPage] || `Página ${selectedPage}`}</span>
        </div>
        
        <Button
          onClick={() => setConfirmDialogOpen(true)}
          variant="outline"
          className="
            border-[#FFC000] text-[#FFC000] 
            hover:bg-[#FFC000] hover:text-black
            transition-all duration-300
            font-bold
          "
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Completar Página
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {pageGroups[selectedPage]?.map(slot => (
          <SlotTile
            key={slot.slot_id}
            slot={slot}
            onUpdate={onUpdateSlot}
            copyId={copyId}
            listing={slotListings[slot.slot_id]}
            listingsLoading={listingsLoading}
            customFields={customFields}
          />
        ))}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="text-[#FFC000]" />
              Completar toda la página
            </DialogTitle>
            <DialogDescription className="text-gray-400 pt-2">
              ¿Quieres marcar todos los cromos faltantes de esta página como conseguidos?
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-sm text-gray-300">
            <p>Esta acción:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Marcará como <strong>&quot;Tengo&quot;</strong> todos los cromos que te faltan.</li>
              <li>No modificará los cromos que ya tienes o tienes repetidos.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isCompletingPage}
              className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteAllPage}
              disabled={isCompletingPage}
              className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
            >
              {isCompletingPage ? 'Completando...' : 'Confirmar Completado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
