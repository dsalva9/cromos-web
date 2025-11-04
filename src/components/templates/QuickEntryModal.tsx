'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, Hash } from 'lucide-react';

import type { SlotProgress } from '@/types/v1.6.0';

interface QuickEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copyTitle: string;
  slots: SlotProgress[];
  onUpdateProgress: (slotId: string, status: 'missing' | 'owned' | 'duplicate', count?: number) => Promise<void>;
}

export function QuickEntryModal({
  open,
  onOpenChange,
  copyTitle,
  slots,
  onUpdateProgress,
}: QuickEntryModalProps) {
  const [checklistInput, setChecklistInput] = useState('');
  const [recentUpdates, setRecentUpdates] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleChecklistEntry = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const globalNum = parseInt(checklistInput.trim());

      if (isNaN(globalNum)) {
        setChecklistInput('');
        return;
      }

      const slot = slots.find(s => s.global_number === globalNum);

      if (!slot) {
        // Number not found
        setRecentUpdates(prev => [`❌ No. ${globalNum} no encontrado`, ...prev.slice(0, 4)]);
        setChecklistInput('');
        return;
      }

      try {
        const newStatus = slot.status === 'missing' ? 'owned' : 'duplicate';
        const newCount = slot.status === 'duplicate' ? slot.count + 1 : 1;

        await onUpdateProgress(slot.slot_id, newStatus, newCount);

        const displayMsg = `✓ No. ${globalNum} - ${slot.label || `Slot ${slot.slot_number}${slot.slot_variant || ''}`} (${slot.page_title})`;
        setRecentUpdates(prev => [displayMsg, ...prev.slice(0, 4)]);
        setChecklistInput('');
      } catch (error) {
        setRecentUpdates(prev => [`❌ Error: ${error}`, ...prev.slice(0, 4)]);
      }
    },
    [checklistInput, slots, onUpdateProgress]
  );

  const getSlotStatusBadge = (slot: SlotProgress) => {
    if (slot.status === 'owned') {
      return <Badge className="bg-green-500">Tengo</Badge>;
    } else if (slot.status === 'duplicate') {
      return <Badge className="bg-blue-500">Duplicado ({slot.count})</Badge>;
    }
    return <Badge variant="outline">Falta</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#111827] text-white border-gray-700 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-[#FFC000]" />
            Entrada Rápida por Número - {copyTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checklist-number">Número de Checklist</Label>
              <form onSubmit={handleChecklistEntry} className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="checklist-number"
                  type="number"
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  placeholder="Ej: 45, 123, 773..."
                  className="bg-[#374151] border-gray-600 text-white flex-1"
                  autoFocus
                />
                <Button type="submit" className="bg-[#FFC000] text-black hover:bg-[#FFD700]">
                  <Check className="w-4 h-4 mr-2" />
                  Marcar
                </Button>
              </form>
              <p className="text-sm text-gray-400">
                Presiona Enter para marcar. Foco automático para entrada rápida.
              </p>
            </div>

            {recentUpdates.length > 0 && (
              <div className="space-y-2">
                <Label>Últimas actualizaciones</Label>
                <div className="bg-[#1F2937] rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                  {recentUpdates.map((update, idx) => (
                    <div key={idx} className="text-sm text-gray-300">
                      {update}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-[#1F2937] rounded-lg p-4">
              <h3 className="font-semibold mb-2">Referencia de Números</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {slots
                  .filter(s => s.global_number !== null)
                  .sort((a, b) => (a.global_number || 0) - (b.global_number || 0))
                  .slice(0, 20)
                  .map(slot => (
                    <div key={slot.slot_id} className="flex justify-between items-center">
                      <span className="text-gray-400">
                        No. {slot.global_number}: {slot.label || `Slot ${slot.slot_number}${slot.slot_variant || ''}`}
                      </span>
                      {getSlotStatusBadge(slot)}
                    </div>
                  ))}
                {slots.filter(s => s.global_number !== null).length > 20 && (
                  <div className="col-span-2 text-gray-500 text-center">
                    ...y {slots.filter(s => s.global_number !== null).length - 20} más
                  </div>
                )}
              </div>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-gray-600"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
