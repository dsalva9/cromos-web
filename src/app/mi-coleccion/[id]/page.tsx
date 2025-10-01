'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import AlbumPager from '@/components/album/AlbumPager';
import AlbumPageGrid from '@/components/album/AlbumPageGrid';
import PageHeader from '@/components/album/PageHeader';
import AlbumSummaryHeader from '@/components/album/AlbumSummaryHeader';
import { useAlbumPages } from '@/hooks/album';

function AlbumView() {
  const params = useParams();
  const searchParams = useSearchParams();

  const collectionId = params.id ? parseInt(params.id as string, 10) : null;
  const pageId = searchParams.get('page');

  const {
    pages,
    currentPage,
    loading,
    error,
    summary,
    collections,
    activeCollection,
    switchingCollection,
    pendingStickerIds,
    switchCollection,
    markStickerOwned,
    reduceStickerOwned,
    toggleStickerWanted,
  } = useAlbumPages(collectionId, pageId);

  if (!collectionId) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-white text-xl">Coleccion no encontrada.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-white text-xl">Cargando album...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center text-white">
        Error: {error}
      </div>
    );
  }

  if (!currentPage) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-white text-xl">
          No pudimos cargar esta pagina del album.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <AlbumSummaryHeader
        collectionName={activeCollection?.name}
        summary={summary}
        collections={collections}
        activeCollectionId={activeCollection?.id ?? null}
        onCollectionChange={switchCollection}
        switching={switchingCollection}
      />
      <div className="relative">
        <AlbumPager
          pages={pages}
          collectionId={collectionId}
          currentPageId={currentPage.id}
        />
        <PageHeader page={currentPage} />
      </div>
      <div className="relative z-0 container mx-auto px-4 py-8">
        <AlbumPageGrid
          page={currentPage}
          onMarkOwned={markStickerOwned}
          onReduceOwned={reduceStickerOwned}
          onToggleWanted={toggleStickerWanted}
          pendingStickerIds={pendingStickerIds}
        />

        {collections.length > 1 && (
          <div className="mt-16 pt-8 border-t border-gray-700 flex flex-col items-center gap-4">
            <h3 className="text-xl font-bold uppercase text-white">
              Otras Colecciones
            </h3>
            <div className="flex flex-col gap-2 items-center">
              <label className="text-xs uppercase tracking-widest text-white/70">
                Cambiar de colección
              </label>
              <select
                value={activeCollection?.id ?? ''}
                onChange={e => switchCollection(Number(e.target.value))}
                disabled={switchingCollection}
                className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 border-2 border-black"
              >
                {collections.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionPageContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
          <div className="text-white text-xl">Cargando...</div>
        </div>
      }
    >
      <AlbumView />
    </Suspense>
  );
}

export default function CollectionPage() {
  return (
    <AuthGuard>
      <CollectionPageContent />
    </AuthGuard>
  );
}
