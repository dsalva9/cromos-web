'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Star, CheckCircle, Copy, X, Trash2 } from 'lucide-react';
import type { UserCollection } from '@/types/collections';

interface OwnedCollectionCardProps {
  collection: UserCollection;
  onActivate: (collectionId: number) => void;
  onRequestRemove: (collectionId: number, collectionName: string) => void;
  isActivating?: boolean;
  isRemoving?: boolean;
}

export function OwnedCollectionCard({
  collection,
  onActivate,
  onRequestRemove,
  isActivating = false,
  isRemoving = false,
}: OwnedCollectionCardProps) {
  return (
    <ModernCard className="bg-white/70 backdrop-blur-sm hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-900/50 transition-all duration-200 overflow-hidden ring-1 ring-black/5">
      {/* Gradient Header Strip with overlay */}
      <div
        className={`h-4 relative ${
          collection.is_user_active
            ? 'bg-gradient-to-r from-green-400 to-green-500'
            : 'bg-gradient-to-r from-slate-400 to-slate-500'
        }`}
      >
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <ModernCardContent className="p-6">
        {/* Collection Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1 pr-2">
            <h4 className="font-bold text-gray-700 text-xl leading-tight mb-2">
              {collection.name}
            </h4>
            <p className="text-sm text-gray-600 font-medium">
              {collection.competition} {collection.year}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {collection.is_user_active ? (
              <Badge className="bg-green-500 text-white shadow-lg ring-1 ring-green-500/20">
                <Star className="w-3 h-3 mr-1" />
                Activa
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-gray-600 border-gray-300 bg-white/50"
              >
                Inactiva
              </Badge>
            )}
            {collection.stats && (
              <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                {Math.round(collection.stats.completion_percentage)}%
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        {collection.stats && (
          <div className="mb-8 space-y-5">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Progreso
                </span>
              </div>
              <div
                className="w-full bg-white/40 rounded-xl h-3 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={collection.stats.completion_percentage}
              >
                <div
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-500/50 h-full rounded-xl transition-all duration-500"
                  style={{
                    width: `${collection.stats.completion_percentage}%`,
                  }}
                />
              </div>
            </div>

            {/* Stats Pills Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-green-900/30 border border-green-700 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-green-700 mb-1">
                  {collection.stats.owned_stickers}
                </div>
                <div className="text-xs text-green-700 font-medium">
                  TENGO
                </div>
              </div>
              <div className="text-center bg-amber-900/30 border border-amber-700 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Copy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-700 mb-1">
                  {collection.stats.duplicates}
                </div>
                <div className="text-xs text-amber-700 font-medium">
                  REPES
                </div>
              </div>
              <div className="text-center bg-red-900/30 border border-red-700 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-2xl font-bold text-red-700 mb-1">
                  {collection.stats.missing}
                </div>
                <div className="text-xs text-red-700 font-medium">
                  FALTAN
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!collection.is_user_active && (
            <Button
              size="sm"
              onClick={() => onActivate(collection.id)}
              disabled={isActivating || isRemoving}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 ring-0 focus-visible:ring-2 focus-visible:ring-indigo-400 opacity-90 hover:opacity-100"
            >
              {isActivating ? (
                'Activando...'
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Hacer Activa
                </>
              )}
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => onRequestRemove(collection.id, collection.name)}
            disabled={isActivating || isRemoving}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 ring-0 focus-visible:ring-2 focus-visible:ring-rose-400 opacity-90 hover:opacity-100"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        </div>

        {collection.is_user_active && (
          <div className="text-center mt-5 p-4 bg-green-50 rounded-xl ring-1 ring-green-100">
            <span className="text-sm text-green-700 font-medium flex items-center justify-center">
              <CheckCircle className="w-4 h-4 mr-2" />
              Esta es tu colección activa
            </span>
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  );
}




