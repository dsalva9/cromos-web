'use client';

import { useRef, useEffect } from 'react';
import { AlbumSummary } from '@/hooks/album';

interface AlbumSummaryHeaderProps {
  collectionName?: string;
  summary: AlbumSummary | null;
  onHeightChange?: (height: number) => void;
}

export default function AlbumSummaryHeader({
  collectionName,
  summary,
  onHeightChange,
}: AlbumSummaryHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);

  const owned = summary?.ownedUnique ?? null;
  const missing = summary?.missing ?? null;
  const duplicates = summary?.duplicates ?? null;
  const completion = summary?.completionPercentage ?? null;

  useEffect(() => {
    if (ref.current && onHeightChange) {
      const observer = new ResizeObserver(entries => {
        onHeightChange(entries[0].target.getBoundingClientRect().height);
      });
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [onHeightChange]);

  return (
    <div ref={ref} className="sticky top-16 z-40 bg-gray-900 border-b-2 border-black py-4 shadow-xl">
      <div className="container mx-auto px-4 flex flex-col gap-4 text-white">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">
            Mi colección
          </p>
          <h1 className="text-2xl font-black uppercase">
            {collectionName ?? 'Colección sin nombre'}
          </h1>
        </div>

        <div className="flex flex-wrap justify-start gap-x-6 gap-y-2 text-sm">
          <div className="font-black">
            <span className="text-white">TENGO</span>{' '}
            <span className="text-[#FFC000]">
              {owned !== null ? owned : '--'}
            </span>
          </div>
          <div className="font-black">
            <span className="text-white">FALTAN</span>{' '}
            <span className="text-[#FFC000]">
              {missing !== null ? missing : '--'}
            </span>
          </div>
          <div className="font-black">
            <span className="text-white">REPES</span>{' '}
            <span className="text-[#FFC000]">
              {duplicates !== null ? duplicates : '--'}
            </span>
          </div>
          <div className="font-black">
            <span className="text-white">TOTAL</span>{' '}
            <span className="text-[#FFC000]">
              {completion !== null ? `${completion}%` : '--%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


