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
        return 'Falta';
      case 'owned':
        return 'Lo Tengo';
      case 'duplicate':
        return 'Repe';
      default:
        return slot.status;
    }
  };

  const handleStatusClick = async () => {
    const statusCycle = {
      missing: 'owned',
      owned: 'duplicate',
      duplicate: 'owned', // If duplicate count goes to 1, change to owned
    } as const;

    let newStatus: string;
    let newCount: number;

    if (slot.status === 'missing') {
      // Missing -> Owned (count = 1)
      newStatus = 'owned';
      newCount = 1;
    } else if (slot.status === 'owned') {
      // Owned -> Duplicate (count = 2)
      newStatus = 'duplicate';
      newCount = 2;
    } else if (slot.status === 'duplicate' && localCount > 1) {
      // Duplicate with count > 1 -> Duplicate with count - 1
      newStatus = 'duplicate';
      newCount = localCount - 1;
    } else {
      // Duplicate with count = 1 -> Owned
      newStatus = 'owned';
      newCount = 1;
    }

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
    let newStatus: string;
    let newCount: number;

    if (slot.status === 'missing') {
      // Missing should never get here, but just in case
      return;
    } else if (slot.status === 'owned') {
      // Owned (count = 1)
      if (delta > 0) {
        // Add one -> Duplicate (count = 2)
        newStatus = 'duplicate';
        newCount = 2;
      } else {
        // Subtract one -> Missing (count = 0)
        newStatus = 'missing';
        newCount = 0;
      }
    } else if (slot.status === 'duplicate') {
      // Duplicate (count >= 2)
      const newTotalCount = localCount + delta;

      if (newTotalCount <= 0) {
        // Count goes to 0 or less -> Missing
        newStatus = 'missing';
        newCount = 0;
      } else if (newTotalCount === 1) {
        // Count goes to 1 -> Owned
        newStatus = 'owned';
        newCount = 1;
      } else {
        // Count is 2 or more -> Duplicate
        newStatus = 'duplicate';
        newCount = newTotalCount;
      }
    } else {
      return;
    }

    try {
      setUpdating(true);
      await onUpdate(slot.slot_id, newStatus, newCount);
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

        {/* Count Controls (for owned and duplicates) */}
        {(slot.status === 'owned' || slot.status === 'duplicate') && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCountChange(-1)}
                disabled={updating}
                className="h-6 w-6 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-white font-bold w-8 text-center">
                {slot.status === 'owned'
                  ? '1'
                  : localCount - 1 > 0
                    ? `${localCount - 1}`
                    : '1'}{' '}
                {/* Display 1 for owned or spares count (total - 1) for duplicates */}
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
