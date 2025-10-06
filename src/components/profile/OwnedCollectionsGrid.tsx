'use client';

import { Badge } from '@/components/ui/badge';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { OwnedCollectionCard } from './OwnedCollectionCard';
import { Trophy } from 'lucide-react';
import type { UserCollection } from '@/types/collections';

interface OwnedCollectionsGridProps {
  collections: UserCollection[];
  onActivate: (collectionId: number) => void;
  onRequestRemove: (collectionId: number, collectionName: string) => void;
  actionLoading: { [key: string]: boolean };
}

export function OwnedCollectionsGrid({
  collections,
  onActivate,
  onRequestRemove,
  actionLoading,
}: OwnedCollectionsGridProps) {
  if (collections.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-3xl font-bold text-white/90 drop-shadow-lg">
            Mis Colecciones
          </h3>
          <Badge className="bg-white/20 backdrop-blur-sm text-white px-5 py-2 text-lg shadow-lg">
            0 propias
          </Badge>
        </div>

        <ModernCard className="bg-white/10 backdrop-blur-sm border border-white/20 ring-1 ring-white/10">
          <ModernCardContent className="p-16 text-center">
            <Trophy className="w-24 h-24 text-white/60 mx-auto mb-8" />
            <h4 className="text-3xl font-semibold text-white/90 mb-6">
              Aún no has añadido ninguna colección
            </h4>
            <p className="text-white/80 text-lg leading-relaxed">
              Explora las colecciones disponibles y añade una para empezar a
              intercambiar cromos
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
          Mis Colecciones
        </h3>
        <Badge className="bg-white/20 backdrop-blur-sm text-white px-5 py-2 text-lg shadow-lg">
          {collections.length} propias
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections.map(collection => (
          <OwnedCollectionCard
            key={collection.id}
            collection={collection}
            onActivate={onActivate}
            onRequestRemove={onRequestRemove}
            isActivating={actionLoading[`activate-${collection.id}`]}
            isRemoving={actionLoading[`remove-${collection.id}`]}
          />
        ))}
      </div>
    </div>
  );
}

