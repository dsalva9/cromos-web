'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, Hash, List } from 'lucide-react';

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
  const [mode, setMode] = useState<'page' | 'checklist'>('checklist');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [checklistInput, setChecklistInput] = useState('');
  const [recentUpdates, setRecentUpdates] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get unique pages
  const pages = Array.from(
    new Map(
      slots.map(s => [s.page_id, { id: s.page_id, number: s.page_number, title: s.page_title }])
    ).values()
  ).sort((a, b) => a.number - b.number);

  // Get slots for selected page
  const pageSlots = selectedPageId
    ? slots.filter(s => s.page_id === selectedPageId).sort((a, b) => {
        if (a.slot_number !== b.slot_number) return a.slot_number - b.slot_number;
        return (a.slot_variant || '').localeCompare(b.slot_variant || '');
      })
    : [];

  // Focus input when modal opens or mode changes
  useEffect(() => {
    if (open && mode === 'checklist') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode]);

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

  const handleSlotToggle = useCallback(
    async (slot: SlotProgress) => {
      try {
        let newStatus: 'missing' | 'owned' | 'duplicate';
        let newCount = 0;

        if (slot.status === 'missing') {
          newStatus = 'owned';
          newCount = 0;
        } else if (slot.status === 'owned') {
          newStatus = 'duplicate';
          newCount = 1;
        } else {
          newStatus = 'missing';
          newCount = 0;
        }

        await onUpdateProgress(slot.slot_id, newStatus, newCount);
      } catch (error) {
        console.error('Error updating slot:', error);
      }
    },
    [onUpdateProgress]
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
          <DialogTitle>Entrada Rápida - {copyTitle}</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'page' | 'checklist')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-[#1F2937]">
            <TabsTrigger value="checklist" className="data-[state=active]:bg-[#FFC000] data-[state=active]:text-black">
              <Hash className="w-4 h-4 mr-2" />
              Por Número
            </TabsTrigger>
            <TabsTrigger value="page" className="data-[state=active]:bg-[#FFC000] data-[state=active]:text-black">
              <List className="w-4 h-4 mr-2" />
              Por Página
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
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
          </TabsContent>

          <TabsContent value="page" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="page-select">Seleccionar Página</Label>
              <Select
                value={selectedPageId || ''}
                onValueChange={(v) => setSelectedPageId(v)}
              >
                <SelectTrigger className="bg-[#374151] border-gray-600 text-white">
                  <SelectValue placeholder="Selecciona una página..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2937] border-gray-700">
                  {pages.map(page => (
                    <SelectItem key={page.id} value={page.id} className="text-white">
                      Página {page.number}: {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPageId && pageSlots.length > 0 && (
              <div className="flex-1 overflow-y-auto bg-[#1F2937] rounded-lg p-4">
                <h3 className="font-semibold mb-3">
                  {pages.find(p => p.id === selectedPageId)?.title} ({pageSlots.length} cromos)
                </h3>
                <div className="space-y-2">
                  {pageSlots.map(slot => (
                    <button
                      key={slot.slot_id}
                      onClick={() => handleSlotToggle(slot)}
                      className="w-full flex items-center justify-between p-3 bg-[#374151] hover:bg-[#4B5563] rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-mono w-12">
                          {slot.slot_number}{slot.slot_variant || ''}
                        </span>
                        <span>{slot.label || 'Sin etiqueta'}</span>
                        {slot.global_number && (
                          <span className="text-xs text-gray-500">
                            (No. {slot.global_number})
                          </span>
                        )}
                      </div>
                      {getSlotStatusBadge(slot)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
