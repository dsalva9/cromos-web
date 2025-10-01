'use client';

import { CSSProperties } from 'react';
import { AlbumPageData } from '@/hooks/album';
import { Progress } from '@/components/ui/progress';

interface PageHeaderProps {
  page: AlbumPageData;
  stickyStyle?: CSSProperties;
}

export default function PageHeader({ page, stickyStyle }: PageHeaderProps) {
  const progress =
    page.total_slots > 0 ? (page.owned_slots / page.total_slots) * 100 : 0;

  return (
    <div
      className="sticky z-20 bg-gray-900/80 backdrop-blur-sm py-3 border-b border-gray-700 mb-8"
      style={stickyStyle}
    >
      <div className="container mx-auto flex items-center justify-between gap-4 px-4">
        <div className="hidden sm:flex items-center gap-4 flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold uppercase text-white truncate">
            {page.title}
          </h2>
        </div>
        <div className="flex w-full sm:max-w-xs items-center justify-center gap-4">
          <Progress value={progress} className="h-2 w-full bg-gray-600" />
          <span className="flex-shrink-0 text-sm font-bold text-gray-300">
            Tengo {page.owned_slots} / {page.total_slots}
          </span>
        </div>
      </div>
    </div>
  );
}
