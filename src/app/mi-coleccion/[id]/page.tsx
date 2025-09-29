'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import AlbumPager from '@/components/album/AlbumPager';
import AlbumPageGrid from '@/components/album/AlbumPageGrid';
import PageHeader from '@/components/album/PageHeader';
import { useAlbumPages } from '@/hooks/album';

function AlbumView() {
  const params = useParams();
  const searchParams = useSearchParams();

  const collectionId = params.id ? parseInt(params.id as string, 10) : null;
  const pageId = searchParams.get('page');

  const { pages, currentPage, loading, error } = useAlbumPages(collectionId, pageId);

  if (loading || !currentPage) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
            <div className="text-white text-xl">Cargando álbum...</div>
        </div>
    );
  }

  if (error) {
    return <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center text-white">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      <AlbumPager pages={pages} collectionId={collectionId!} currentPageId={currentPage.id} />
      <PageHeader page={currentPage} />
      <AlbumPageGrid page={currentPage} />
    </div>
  );
}

function CollectionPageContent() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
                <div className="text-white text-xl">Cargando...</div>
            </div>
        }>
            <AlbumView />
        </Suspense>
    )
}

export default function CollectionPage() {
  return (
    <AuthGuard>
      <CollectionPageContent />
    </AuthGuard>
  );
}
