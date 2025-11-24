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

  // Focus input when modal opens (Desktop only)
  useEffect(() => {
    if (open && window.matchMedia('(min-width: 768px)').matches) {
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
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border">Tengo</Badge>;
    } else if (slot.status === 'duplicate') {
      return <Badge className="bg-[#FFC000]/20 text-[#FFC000] border-[#FFC000]/50 border">Repe ({slot.count})</Badge>;
    }
    return <Badge variant="outline" className="text-gray-500 border-gray-700">Falta</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-gray-900 text-white border-gray-800 max-h-[80vh] flex flex-col shadow-2xl shadow-black/50">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-[#FFC000]/10 p-2 rounded-lg">
              <Hash className="w-5 h-5 text-[#FFC000]" />
            </div>
            <div>
              <span className="block font-bold">Entrada Rápida</span>
              <span className="text-sm font-normal text-gray-400">{copyTitle}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="checklist-number" className="text-gray-300">Número de Checklist</Label>
              <form onSubmit={handleChecklistEntry} className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    ref={inputRef}
                    id="checklist-number"
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    placeholder="Ej: 45, 123, 773..."
                    className="bg-gray-800 border-gray-700 text-white h-12 text-lg pl-4 focus:ring-[#FFC000] focus:border-[#FFC000]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono border border-gray-700 rounded px-1.5 py-0.5">
                    ENTER
                  </div>
                </div>
                <Button type="submit" className="bg-[#FFC000] text-black hover:bg-[#FFD700] h-12 px-6 font-bold">
                  <Check className="w-5 h-5 mr-2" />
                  Marcar
                </Button>
              </form>
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFC000] animate-pulse" />
                Modo de entrada rápida activo
              </p>
            </div>

            {recentUpdates.length > 0 && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-gray-400 text-xs uppercase tracking-wider font-bold">Últimas actualizaciones</Label>
                <div className="bg-gray-800/50 rounded-xl p-3 space-y-2 border border-gray-700/50">
                  {recentUpdates.map((update, idx) => (
                    <div key={idx} className="text-sm text-gray-300 flex items-center gap-2 font-mono">
                      {update}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-500" />
                Referencia de Números
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {slots
                  .filter(s => s.global_number !== null)
                  .sort((a, b) => (a.global_number || 0) - (b.global_number || 0))
                  .slice(0, 20)
                  .map(slot => (
                    <div key={slot.slot_id} className="flex justify-between items-center py-1 border-b border-gray-700/50 last:border-0">
                      <span className="text-gray-400 font-mono">
                        <span className="text-gray-500 mr-2">#{slot.global_number}</span>
                        {slot.label || `Slot ${slot.slot_number}${slot.slot_variant || ''}`}
                      </span>
                      {getSlotStatusBadge(slot)}
                    </div>
                  ))}
                {slots.filter(s => s.global_number !== null).length > 20 && (
                  <div className="col-span-1 sm:col-span-2 text-gray-500 text-center py-4 text-xs uppercase tracking-wider">
                    ...y {slots.filter(s => s.global_number !== null).length - 20} más
                  </div>
                )}
              </div>
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-800">
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            Cerrar Esc
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
