'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Plus } from 'lucide-react';
import type { Collection } from '@/types/collections';

interface AvailableCollectionCardProps {
  collection: Collection;
  onAdd: (collectionId: number) => void;
  isAdding?: boolean;
}

export function AvailableCollectionCard({
  collection,
  onAdd,
  isAdding = false,
}: AvailableCollectionCardProps) {
  return (
    <ModernCard className="bg-white/70 backdrop-blur-sm hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-900/50 hover:ring-1 hover:ring-white/30 transition-all duration-200 overflow-hidden border-2 border-dashed border-yellow-200/60 shadow-lg shadow-slate-900/30 relative">
      {/* Left Accent Rail */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-yellow-500" />

      {/* Gradient Header Strip with overlay */}
      <div className="h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 relative">
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <ModernCardContent className="p-6 pl-8">
        {/* Collection Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <h4 className="font-bold text-gray-700 text-xl leading-tight mb-2">
              {collection.name}
            </h4>
            <p className="text-sm text-gray-600 font-medium">
              {collection.competition} {collection.year}
            </p>
          </div>
          <Badge className="bg-yellow-100 text-yellow-800 shadow-lg ring-1 ring-yellow-200">
            <Plus className="w-3 h-3 mr-1" />
            Nueva
          </Badge>
        </div>

        {collection.description && (
          <p className="text-sm text-gray-600 mb-8 line-clamp-3 leading-relaxed">
            {collection.description}
          </p>
        )}

        {/* Add Button */}
        <Button
          size="sm"
          onClick={() => onAdd(collection.id)}
          disabled={isAdding}
          className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 ring-0 focus-visible:ring-2 focus-visible:ring-green-400 opacity-90 hover:opacity-100"
        >
          {isAdding ? (
            'Añadiendo...'
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Añadir a mis colecciones
            </>
          )}
        </Button>
      </ModernCardContent>
    </ModernCard>
  );
}

