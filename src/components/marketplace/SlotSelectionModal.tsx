'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TemplateSlot } from '@/hooks/templates/useTemplateSlots';

interface SlotSelectionModalProps {
  open: boolean;
  onClose: () => void;
  slots: TemplateSlot[];
  loading: boolean;
  onSlotSelect: (slot: TemplateSlot) => void;
  collectionTitle: string;
}

/**
 * SlotSelectionModal Component
 *
 * Modal for selecting a specific slot from a template copy.
 * Shows slots grouped by page with user progress indicators.
 *
 * @param open - Whether modal is open
 * @param onClose - Callback to close modal
 * @param slots - Array of template slots
 * @param loading - Whether slots are loading
 * @param onSlotSelect - Callback when slot is selected
 * @param collectionTitle - Title of the selected collection
 */
export function SlotSelectionModal({
  open,
  onClose,
  slots,
  loading,
  onSlotSelect,
  collectionTitle,
}: SlotSelectionModalProps) {
  // Filter to only show slots with duplicates
  const duplicateSlots = slots.filter(
    slot => slot.user_status === 'duplicate' && slot.user_count > 0
  );

  // Group slots by page
  const slotsByPage = duplicateSlots.reduce(
    (acc, slot) => {
      const pageKey = `${slot.page_number}-${slot.page_title}`;
      if (!acc[pageKey]) {
        acc[pageKey] = {
          pageNumber: slot.page_number,
          pageTitle: slot.page_title,
          slots: [],
        };
      }
      acc[pageKey].slots.push(slot);
      return acc;
    },
    {} as Record<
      string,
      { pageNumber: number; pageTitle: string; slots: TemplateSlot[] }
    >
  );

  const pages = Object.values(slotsByPage).sort(
    (a, b) => a.pageNumber - b.pageNumber
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#374151] border-2 border-black text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Seleccionar Cromo a Publicar
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Colección: <span className="text-[#FFC000]">{collectionTitle}</span>
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full mx-auto" />
            <p className="text-gray-400 mt-4">Cargando cromos...</p>
          </div>
        )}

        {!loading && duplicateSlots.length === 0 && (
          <div className="py-8 text-center text-gray-400">
            <p className="font-semibold text-white mb-2">No tienes cromos repetidos en esta colección</p>
            <p className="text-sm">
              Para auto-completar el número del cromo, selecciona uno marcado como &quot;REPE&quot; en tu colección.
            </p>
            <p className="text-sm mt-2 text-gray-500">
              Si prefieres, puedes cerrar esta ventana y escribir el número manualmente.
            </p>
            <Button
              onClick={onClose}
              variant="outline"
              className="mt-4 border-2 border-black text-white hover:bg-[#1F2937]"
            >
              Cerrar y escribir manualmente
            </Button>
          </div>
        )}

        {!loading && pages.length > 0 && (
          <div className="space-y-6">
            {pages.map(page => (
              <div key={`${page.pageNumber}-${page.pageTitle}`}>
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">
                  Página {page.pageNumber}: {page.pageTitle}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {page.slots.map(slot => (
                    <Button
                      key={slot.slot_id}
                      onClick={() => {
                        onSlotSelect(slot);
                        onClose();
                      }}
                      variant="outline"
                      className="h-auto p-3 flex flex-col items-start gap-2 border-2 border-black bg-[#1F2937] hover:bg-[#FFC000] hover:text-black hover:border-[#FFC000] transition-colors"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-sm">
                          #{slot.slot_number}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-green-600 text-white text-xs px-1.5 py-0"
                        >
                          x{slot.user_count}
                        </Badge>
                      </div>
                      {slot.slot_label && (
                        <span className="text-xs text-left truncate w-full">
                          {slot.slot_label}
                        </span>
                      )}
                      {slot.is_special && (
                        <Badge
                          variant="outline"
                          className="text-xs border-yellow-500 text-yellow-400"
                        >
                          ★ Especial
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-600 flex justify-end">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-2 border-black text-white hover:bg-[#1F2937]"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
