'use client';

import { ChangeEvent } from 'react';
import { AlbumSummary, UserCollectionOption } from '@/hooks/album';

interface AlbumSummaryHeaderProps {
  collectionName?: string;
  summary: AlbumSummary | null;
  collections: UserCollectionOption[];
  activeCollectionId?: number | null;
  onCollectionChange: (collectionId: number) => void;
  switching?: boolean;
}

export default function AlbumSummaryHeader({
  collectionName,
  summary,
  collections,
  activeCollectionId,
  onCollectionChange,
  switching = false,
}: AlbumSummaryHeaderProps) {
  const owned = summary?.ownedUnique ?? null;
  const wanted = summary?.wanted ?? null;
  const duplicates = summary?.duplicates ?? null;
  const completion = summary?.completionPercentage ?? null;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      onCollectionChange(value);
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-teal-600/95 to-cyan-600/95 backdrop-blur-sm border-b border-white/20">
      <div className="container mx-auto px-4 py-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between text-white">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">Mi coleccion</p>
          <h1 className="text-3xl font-bold drop-shadow-lg">
            {collectionName ?? 'Coleccion sin nombre'}
          </h1>
        </div>

        {collections.length > 0 && (
          <div className="flex flex-col gap-2 md:items-end">
            <label className="text-xs uppercase tracking-widest text-white/70">
              Cambiar coleccion
            </label>
            <select
              value={(activeCollectionId ?? (collections[0]?.id ?? ''))}
              onChange={handleChange}
              disabled={switching}
              className="bg-white/90 text-gray-900 text-sm font-semibold px-4 py-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
              {collections.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-3 text-sm font-semibold">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white">
              <span className="text-green-200">Tengo</span>{' '}
              {owned !== null ? owned : '--'}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white">
              <span className="text-orange-200">Me falta</span>{' '}
              {wanted !== null ? wanted : '--'}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white">
              <span className="text-purple-200">Repes</span>{' '}
              {duplicates !== null ? duplicates : '--'}
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white">
              {completion !== null ? `${completion}%` : '--%'}{' '}
              <span className="text-yellow-200">*</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

