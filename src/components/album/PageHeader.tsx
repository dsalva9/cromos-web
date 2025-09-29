'use client';

import Image from 'next/image';
import { AlbumPageData } from '@/hooks/album';
import { Progress } from '@/components/ui/progress';

interface PageHeaderProps {
  page: AlbumPageData;
}

export default function PageHeader({ page }: PageHeaderProps) {
  const logoUrl = page.kind === 'team' ? page.collection_teams?.logo_url : null;
  const progress = page.total_slots > 0 ? (page.owned_slots / page.total_slots) * 100 : 0;

  return (
    <div className="bg-white/10 backdrop-blur-sm border-b border-t border-white/20 py-4 px-4 sticky top-[72px] z-20">
      <div className="container mx-auto flex items-center gap-4">
        {logoUrl && (
          <div className="relative h-12 w-12 flex-shrink-0">
            <Image src={logoUrl} alt={`Crest of ${page.title}`} fill className="object-contain" />
          </div>
        )}
        <div className="flex-grow">
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">{page.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Progress value={progress} className="h-2 w-full max-w-xs bg-black/20" />
            <span className="text-sm font-semibold text-white/80">
              Tengo {page.owned_slots} / {page.total_slots}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}