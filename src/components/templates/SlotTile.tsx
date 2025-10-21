'use client';

import { useState } from 'react';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface SlotProgress {
  slot_id: string;
  label: string | null;
  is_special: boolean;
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
}

interface SlotTileProps {
  slot: SlotProgress;
  onUpdate: (slotId: string, status: string, count: number) => Promise<void>;
  copyId: string;
}

export function SlotTile({ slot, onUpdate, copyId }: SlotTileProps) {
  const [updating, setUpdating] = useState(false);
  const [localCount, setLocalCount] = useState(slot.count);

  const getStatusColor = () => {
    switch (slot.status) {
      case 'missing':
        return 'bg-gray-700 border-gray-600';
      case 'owned':
        return 'bg-green-900 border-green-700';
      case 'duplicate':
        return 'bg-[#FFC000] border-[#FFD700]';
      default:
        return 'bg-gray-700';
    }
  };

  const getStatusLabel = () => {
    switch (slot.status) {
      case 'missing':
        return 'Faltante';
      case 'owned':
        return 'Tenida';
      case 'duplicate':
        return 'Duplicada';
      default:
        return slot.status;
    }
  };

  const handleStatusClick = async () => {
    const statusCycle = {
      missing: 'owned',
      owned: 'duplicate',
      duplicate: 'missing',
    } as const;

    const newStatus = statusCycle[slot.status];
    const newCount = newStatus === 'duplicate' ? 2 : 0;

    try {
      setUpdating(true);
      await onUpdate(slot.slot_id, newStatus, newCount);
      setLocalCount(newCount);
      toast.success('¡Actualizado!');
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setUpdating(false);
    }
  };

  const handleCountChange = async (delta: number) => {
    if (slot.status !== 'duplicate') return;

    const newCount = Math.max(1, localCount + delta);

    try {
      setUpdating(true);
      await onUpdate(slot.slot_id, 'duplicate', newCount);
      setLocalCount(newCount);
    } catch {
      toast.error('Error al actualizar cantidad');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ModernCard className={cn('relative', getStatusColor())}>
      <ModernCardContent className="p-3 space-y-2">
        {/* Label */}
        <div className="text-center">
          <p className="text-xs font-bold text-white line-clamp-2 min-h-[2rem]">
            {slot.label || `Cromo ${slot.slot_id.slice(-4)}`}
          </p>
        </div>

        {/* Status Badge */}
        <div className="text-center">
          <Badge
            variant="outline"
            className={cn(
              'cursor-pointer uppercase text-xs font-bold',
              slot.status === 'missing' && 'bg-gray-800 text-gray-300',
              slot.status === 'owned' && 'bg-green-800 text-green-200',
              slot.status === 'duplicate' && 'bg-black text-[#FFC000]'
            )}
            onClick={handleStatusClick}
          >
            {getStatusLabel()}
          </Badge>
        </div>

        {/* Count Controls (only for duplicates) */}
        {slot.status === 'duplicate' && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCountChange(-1)}
                disabled={updating || localCount <= 1}
                className="h-6 w-6 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-white font-bold w-8 text-center">
                {localCount}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCountChange(1)}
                disabled={updating}
                className="h-6 w-6 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Publish Button */}
            <Link href={`/mis-plantillas/${copyId}/publicar/${slot.slot_id}`}>
              <Button
                size="sm"
                className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] text-xs h-7"
              >
                <Upload className="mr-1 h-3 w-3" />
                Publicar
              </Button>
            </Link>
          </div>
        )}

        {/* Loading Overlay */}
        {updating && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
            <div className="animate-spin h-4 w-4 border-2 border-white border-r-transparent rounded-full" />
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  );
}
