'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/hooks/use-router';
import Link from '@/components/ui/link';
import { SimplifiedListingForm } from '@/components/marketplace/SimplifiedListingForm';
import { useCreateListing } from '@/hooks/marketplace/useCreateListing';
import AuthGuard from '@/components/AuthGuard';
import { toast } from 'sonner';
import { CreateListingForm } from '@/types/v1.6.0';
import { logger } from '@/lib/logger';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

function CreateListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createListing, loading } = useCreateListing();

  // Get initial data from query parameters
  const initialData = useMemo(() => {
    const title = searchParams.get('title');
    const description = searchParams.get('description');
    const collection = searchParams.get('collection');
    const isGroup = searchParams.get('isGroup') === 'true';

    if (!title) return undefined;

    return {
      title,
      description: description || '',
      collection_name: collection || '',
      is_group: isGroup,
    };
  }, [searchParams]);

  // Get back URL from query parameters (for navigation from album page)
  const backUrl = searchParams.get('from') || '/marketplace';

  const handleSubmit = async (data: CreateListingForm) => {
    try {
      const listingId = await createListing(data);
      toast.success('¡Anuncio publicado con éxito!');
      router.push(`/marketplace/${listingId}`);
    } catch (error) {
      logger.error('Create listing error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al crear el anuncio'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href={backUrl}
          className="inline-flex items-center text-[#FFC000] hover:text-[#FFD700] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backUrl.includes('/mis-plantillas/') ? 'Volver al Álbum' : 'Volver al Marketplace'}
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            Publicar Anuncio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {initialData ? 'Revisa y completa los detalles de tu pack' : 'Comparte tu cromo con la comunidad'}
          </p>
        </div>

        <SimplifiedListingForm
          onSubmit={handleSubmit}
          loading={loading}
          initialData={initialData}
          disablePackOption={initialData?.is_group}
        />
      </div>
    </div>
  );
}

export default function CreateListingPage() {
  return (
    <AuthGuard>
      <CreateListingContent />
    </AuthGuard>
  );
}
