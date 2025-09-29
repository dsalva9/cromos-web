'use client';

import Link from 'next/link';
import { CollectionPage } from '@/hooks/album';
import { Shield, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AlbumPagerProps {
  pages: CollectionPage[];
  collectionId: number;
  currentPageId: number;
}

export default function AlbumPager({ pages, collectionId, currentPageId }: AlbumPagerProps) {
  const teamPages = pages.filter(p => p.kind === 'team');
  const specialPages = pages.filter(p => p.kind === 'special');

  const renderPageLink = (page: CollectionPage) => {
    const isActive = page.id === currentPageId;
    const teamCrest = page.collection_teams?.crest_url;

    return (
      <Link
        key={page.id}
        href={`/mi-coleccion/${collectionId}?page=${page.id}`}
        className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white',
          'whitespace-nowrap text-sm font-semibold',
          isActive
            ? 'bg-white text-gray-900 shadow-md'
            : 'bg-white/10 text-white hover:bg-white/20'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {page.kind === 'team' && teamCrest ? (
          <Image src={teamCrest} alt={`Escudo de ${page.title}`} width={24} height={24} className="h-6 w-6" />
        ) : (
          <Shield className="h-6 w-6" />
        )}
        <span>{page.title}</span>
      </Link>
    );
  };

  return (
    <div className="sticky top-0 z-30 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-x-auto p-4 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
            {teamPages.length > 0 && (
                <div className="flex items-center gap-2">
                    {teamPages.map(renderPageLink)}
                </div>
            )}

            {specialPages.length > 0 && (
                <>
                    <div className="h-8 w-px bg-white/20 mx-2" />
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-white/80 font-semibold text-sm ml-2">
                            <Sparkles className="h-5 w-5" />
                            <span>Especiales</span>
                        </div>
                        {specialPages.map(renderPageLink)}
                    </div>
                </>
            )}
        </div>
    </div>
  );
}