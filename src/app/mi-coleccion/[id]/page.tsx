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
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Coleccion no encontrada.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Cargando album...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center text-white">
        Error: {error}
      </div>
    );
  }

  if (!currentPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">No pudimos cargar esta pagina del album.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      <AlbumSummaryHeader
        collectionName={activeCollection?.name}
        summary={summary}
        collections={collections}
        activeCollectionId={activeCollection?.id ?? null}
        onCollectionChange={switchCollection}
        switching={switchingCollection}
      />

      <AlbumPager
        pages={pages}
        collectionId={collectionId}
        currentPageId={currentPage.id}
      />
      <PageHeader page={currentPage} />
      <AlbumPageGrid
        page={currentPage}
        onMarkOwned={markStickerOwned}
        onReduceOwned={reduceStickerOwned}
        onToggleWanted={toggleStickerWanted}
        pendingStickerIds={pendingStickerIds}
      />
    </div>
  );
}

function CollectionPageContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
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
