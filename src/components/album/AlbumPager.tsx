'use client';

import { useRef, useState, useEffect, useCallback, CSSProperties } from 'react';
import Link from 'next/link';
import { CollectionPage } from '@/hooks/album';
import { Shield, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AlbumPagerProps {
  pages: CollectionPage[];
  collectionId: number;
  currentPageId: number;
  stickyStyle?: CSSProperties;
  onHeightChange?: (height: number) => void;
}

export default function AlbumPager({
  pages,
  collectionId,
  currentPageId,
  stickyStyle,
  onHeightChange,
}: AlbumPagerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkForScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const hasOverflow = el.scrollWidth > el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(
        hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 1
      );
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      checkForScroll();
      window.addEventListener('resize', checkForScroll);

      const observer = new ResizeObserver(entries => {
        if (onHeightChange) {
          onHeightChange(entries[0].target.getBoundingClientRect().height);
        }
      });
      observer.observe(el);

      return () => {
        window.removeEventListener('resize', checkForScroll);
        observer.disconnect();
      };
    }
  }, [checkForScroll, pages, onHeightChange]);

  // Effect to scroll the active page link into view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const activeLink = container.querySelector<HTMLAnchorElement>(
        '[aria-current="page"]'
      );
      if (activeLink) {
        activeLink.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentPageId, pages]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.8;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const teamPages = pages.filter(p => p.kind === 'team');
  const specialPages = pages.filter(p => p.kind === 'special');

  const renderPageLink = (page: CollectionPage) => {
    const isActive = page.id === currentPageId;
    const teamLogo = page.collection_teams?.[0]?.logo_url;

    return (
      <Link
        key={page.id}
        href={`/mi-coleccion/${collectionId}?page=${page.id}`}
        className={cn(
          'flex items-center gap-3 px-4 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#FFC000]',
          'whitespace-nowrap text-sm',
          isActive
            ? 'bg-[#FFC000] text-gray-900 font-black border-2 border-black uppercase'
            : 'bg-white text-gray-600 border-2 border-black hover:bg-gray-100 font-bold'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {page.kind === 'team' && teamLogo ? (
          <Image
            src={teamLogo}
            alt={`Escudo de ${page.title}`}
            width={24}
            height={24}
            className="h-6 w-6"
          />
        ) : (
          <Shield className="h-6 w-6" />
        )}
        <span>{page.title}</span>
      </Link>
    );
  };

  return (
    <div
      className="sticky z-30 bg-white border-y-2 border-black shadow-xl"
      style={stickyStyle}
    >
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 h-10 w-10 rounded-md bg-white hover:bg-gray-100 border-2 border-black text-gray-900 shadow-xl"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      <div
        ref={scrollContainerRef}
        onScroll={checkForScroll}
        className="flex items-center gap-2 overflow-x-auto p-4 container mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {teamPages.length > 0 && (
          <div className="flex items-center gap-2">
            {teamPages.map(renderPageLink)}
          </div>
        )}

        {specialPages.length > 0 && (
          <>
            <div className="h-8 w-px bg-gray-200 mx-2" />
            <div className="flex items-center gap-2">
              <div className="flex flex-shrink-0 items-center gap-2 text-gray-600 font-bold uppercase text-sm ml-2">
                <Sparkles className="h-5 w-5" />
                <span>Especiales</span>
              </div>
              {specialPages.map(renderPageLink)}
            </div>
          </>
        )}
      </div>
      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 h-10 w-10 rounded-md bg-white hover:bg-gray-100 border-2 border-black text-gray-900 shadow-xl"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}

