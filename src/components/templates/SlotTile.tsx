'use client';

import { useState } from 'react';

import { Minus, Plus, Upload, Check, Copy as CopyIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface SlotProgress {
  slot_id: string;
  label: string | null;
  is_special: boolean;
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
  slot_number?: number;
  slot_variant?: string | null;
  global_number?: number | null;
  data?: Record<string, string | number | boolean>;
}

interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

interface SlotListing {
  id: number;
  title: string;
  status: 'active' | 'sold' | 'removed';
}

interface SlotTileProps {
  slot: SlotProgress;
  onUpdate: (slotId: string, status: string, count: number) => Promise<void>;
  copyId: string;
  listing?: SlotListing;
  listingsLoading?: boolean;
  customFields?: CustomField[];
}

export function SlotTile({ slot, onUpdate, copyId, listing, listingsLoading, customFields = [] }: SlotTileProps) {
  const [updating, setUpdating] = useState(false);
  const [localCount, setLocalCount] = useState(slot.count);

  const getStatusStyles = () => {
    switch (slot.status) {
      case 'owned':
        return 'bg-green-900/20 border-green-500/50 hover:border-green-500';
      case 'duplicate':
        return 'bg-[#FFC000]/10 border-[#FFC000]/50 hover:border-[#FFC000]';
      default: // missing
        return 'bg-gray-900 border-gray-800 hover:border-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (slot.status) {
      case 'owned':
        return <Check className="w-3 h-3 mr-1" />;
      case 'duplicate':
        return <CopyIcon className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (slot.status) {
      case 'missing':
        return 'Falta';
      case 'owned':
        return 'Tengo';
      case 'duplicate':
        return 'Repe';
      default:
        return slot.status;
    }
  };

  const handleStatusClick = async () => {
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
      return;
    } else if (slot.status === 'owned') {
      if (delta > 0) {
        newStatus = 'duplicate';
        newCount = 2;
      } else {
        newStatus = 'missing';
        newCount = 0;
      }
    } else if (slot.status === 'duplicate') {
      const newTotalCount = localCount + delta;
      if (newTotalCount <= 0) {
        newStatus = 'missing';
        newCount = 0;
      } else if (newTotalCount === 1) {
        newStatus = 'owned';
        newCount = 1;
      } else {
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
    <div 
      className={cn(
        'relative rounded-xl border transition-all duration-200 group flex flex-col h-full overflow-hidden',
        getStatusStyles()
      )}
    >
      {/* Top Status Bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 transition-colors duration-300"
        style={{
          background: slot.status === 'owned' ? '#22c55e' : slot.status === 'duplicate' ? '#FFC000' : 'transparent'
        }}
      />

      <div className="p-3 flex flex-col h-full">
        {/* Header Info */}
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs font-mono text-gray-500">#{slot.slot_number}</span>
            {slot.is_special && (
              <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1 rounded border border-purple-500/30">SPECIAL</span>
            )}
          </div>
          <p className="text-xs font-bold text-white line-clamp-2 min-h-[2rem] leading-tight">
            {slot.label || `Cromo ${slot.slot_number || ''}`}
          </p>

          {/* Custom fields data */}
          {customFields.length > 0 && slot.data && Object.keys(slot.data).length > 0 && (
            <div className="mt-1 space-y-0.5 text-[10px]">
              {customFields.map(field => {
                const value = slot.data?.[field.name];
                if (value === undefined || value === null || value === '') return null;
                return (
                  <div key={field.name} className="flex gap-1 text-gray-400">
                    <span className="font-medium">{field.name}:</span>
                    <span className="text-gray-300 truncate">{String(value)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3">
          {/* Status Button */}
          <button
            onClick={handleStatusClick}
            disabled={updating}
            className={cn(
              "w-full py-1.5 px-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center",
              slot.status === 'missing' && "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white",
              slot.status === 'owned' && "bg-green-500 text-black hover:bg-green-400",
              slot.status === 'duplicate' && "bg-[#FFC000] text-black hover:bg-[#FFD700]"
            )}
          >
            {getStatusIcon()}
            {getStatusLabel()}
          </button>

          {/* Controls for Owned/Duplicate */}
          {(slot.status === 'owned' || slot.status === 'duplicate') && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Counter */}
              <div className="flex items-center justify-between bg-black/20 rounded-lg p-1">
                <button
                  onClick={() => handleCountChange(-1)}
                  disabled={updating}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-bold text-white font-mono">
                  {slot.status === 'owned' ? '1' : localCount}
                </span>
                <button
                  onClick={() => handleCountChange(1)}
                  disabled={updating}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Marketplace Action */}
              {listing ? (
                <Link href={`/marketplace/${listing.id}`} className="block">
                  <div className="w-full bg-green-900/30 border border-green-800 rounded-lg py-1 px-2 flex items-center justify-center gap-1.5 text-[10px] text-green-400 hover:bg-green-900/50 transition-colors cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>VER ANUNCIO</span>
                  </div>
                </Link>
              ) : listingsLoading ? (
                <div className="w-full h-6 bg-gray-800 animate-pulse rounded-lg" />
              ) : slot.status === 'duplicate' && localCount >= 2 ? (
                <Link href={`/mis-plantillas/${copyId}/publicar/${slot.slot_id}`} className="block">
                  <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg py-1 px-2 text-[10px] font-medium transition-colors flex items-center justify-center gap-1.5">
                    <Upload className="w-3 h-3" />
                    <span>CREAR ANUNCIO</span>
                  </button>
                </Link>
              ) : (
                <button
                  disabled
                  title="Necesitas al menos 2 cromos para crear un anuncio"
                  className="w-full bg-gray-900 text-gray-600 rounded-lg py-1 px-2 text-[10px] font-medium flex items-center justify-center gap-1.5 cursor-not-allowed opacity-50"
                >
                  <Upload className="w-3 h-3" />
                  <span>CREAR ANUNCIO</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {updating && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-10">
          <div className="animate-spin h-5 w-5 border-2 border-[#FFC000] border-r-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
