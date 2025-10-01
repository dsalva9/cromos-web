'use client';

import Image from 'next/image';
import { AlbumPageData } from '@/hooks/album';
import { Progress } from '@/components/ui/progress';

interface PageHeaderProps {
  page: AlbumPageData;
}

export default function PageHeader({ page }: PageHeaderProps) {
  const logoUrl =
    page.kind === 'team' ? page.collection_teams?.[0]?.logo_url : null;
  const progress =
    page.total_slots > 0 ? (page.owned_slots / page.total_slots) * 100 : 0;

  return (
    <div className="sticky top-[224px] lg:top-[172px] z-10 bg-gray-900/90 backdrop-blur-sm border-b-2 border-gray-700 py-2 mb-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4">
          <Progress
            value={progress}
            className="h-2 w-full max-w-xs bg-gray-700"
            indicatorClassName="bg-gradient-to-r from-yellow-400 to-orange-500"
          />
          <span className="text-sm font-bold text-gray-300 flex-shrink-0">
            Tengo {page.owned_slots} / {page.total_slots}
          </span>
        </div>
      </div>
    </div>
  );
}
