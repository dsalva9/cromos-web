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
    <div className="sticky top-16 z-40 bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-white">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
            Mi coleccion
          </p>
          <h1 className="text-2xl font-extrabold uppercase drop-shadow-lg">
            {collectionName ?? 'Coleccion sin nombre'}
          </h1>
        </div>

        <div className="flex flex-wrap justify-start lg:justify-end gap-x-6 gap-y-2 text-sm border-t border-gray-700 lg:border-none pt-4 lg:pt-0">
          <div className="font-bold">
            <span className="text-gray-300">TENGO</span>{' '}
            <span className="text-[#FFC000]">
              {owned !== null ? owned : '--'}
            </span>
          </div>
          <div className="font-bold">
            <span className="text-gray-300">ME FALTA</span>{' '}
            <span className="text-[#FFC000]">
              {wanted !== null ? wanted : '--'}
            </span>
          </div>
          <div className="font-bold">
            <span className="text-gray-300">REPES</span>{' '}
            <span className="text-[#FFC000]">
              {duplicates !== null ? duplicates : '--'}
            </span>
          </div>
          <div className="font-bold">
            <span className="text-gray-300">COMPLETADO</span>{' '}
            <span className="text-[#FFC000]">
              {completion !== null ? `${completion}%` : '--%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
