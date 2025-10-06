'use client';

import { Badge } from '@/components/ui/badge';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { AvailableCollectionCard } from './AvailableCollectionCard';
import { Star } from 'lucide-react';
import type { Collection } from '@/types/collections';

interface AvailableCollectionsGridProps {
  collections: Collection[];
  onAdd: (collectionId: number) => void;
  actionLoading: { [key: string]: boolean };
}

export function AvailableCollectionsGrid({
  collections,
  onAdd,
  actionLoading,
}: AvailableCollectionsGridProps) {
  if (collections.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-3xl font-bold text-white/90 drop-shadow-lg">
            Colecciones Disponibles
          </h3>
          <Badge className="bg-yellow-500 text-white px-5 py-2 text-lg shadow-lg">
            0 disponibles
          </Badge>
        </div>

        <ModernCard className="bg-white/10 backdrop-blur-sm border border-white/20 ring-1 ring-white/10">
          <ModernCardContent className="p-16 text-center">
            <Star className="w-24 h-24 text-white/60 mx-auto mb-8" />
            <h4 className="text-3xl font-semibold text-white/90 mb-6">
              ¡Ya has añadido todas las colecciones disponibles!
            </h4>
            <p className="text-white/80 text-lg leading-relaxed">
              No hay más colecciones para añadir en este momento
            </p>
          </ModernCardContent>
        </ModernCard>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-3xl font-bold text-white/90 drop-shadow-lg">
          Colecciones Disponibles
        </h3>
        <Badge className="bg-yellow-500 text-white px-5 py-2 text-lg shadow-lg">
          {collections.length} disponible
          {collections.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections.map(collection => (
          <AvailableCollectionCard
            key={collection.id}
            collection={collection}
            onAdd={onAdd}
            isAdding={actionLoading[`add-${collection.id}`]}
          />
        ))}
      </div>
    </div>
  );
}

