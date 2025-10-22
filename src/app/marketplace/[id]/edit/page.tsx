'use client';

import { useParams, useRouter } from 'next/navigation';
import { useListing } from '@/hooks/marketplace/useListing';
import { useUpdateListing } from '@/hooks/marketplace/useUpdateListing';
import { ListingForm } from '@/components/marketplace/ListingForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { toast } from 'sonner';
import { useUser } from '@/components/providers/SupabaseProvider';
import { CreateListingForm } from '@/types/v1.6.0';
import { logger } from '@/lib/logger';

function EditListingContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const listingId = params.id as string;
  const { listing, loading, error } = useListing(listingId);
  const { updateListing, loading: saving } = useUpdateListing();

  const handleSubmit = async (data: CreateListingForm) => {
    try {
      await updateListing(listingId, data);
      toast.success('¡Anuncio actualizado con éxito!');
      router.push(`/marketplace/${listingId}`);
    } catch (error) {
      logger.error('Update listing error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al actualizar el anuncio'
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Anuncio no encontrado
          </h2>
          <p className="text-gray-400 mb-6">
            {error ||
              'Este anuncio puede haber sido eliminado o ya no está disponible'}
          </p>
          <Link href="/marketplace">
            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
              Volver al Marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is the owner
  if (user?.id !== listing.user_id) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Acceso denegado
          </h2>
          <p className="text-gray-400 mb-6">
            Solo puedes editar tus propios anuncios
          </p>
          <Link href={`/marketplace/${listingId}`}>
            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
              Volver al Anuncio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <Link
            href={`/marketplace/${listingId}`}
            className="inline-flex items-center text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Anuncio
          </Link>
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Editar Anuncio
          </h1>
          <p className="text-gray-400">
            Actualiza la información de tu anuncio
          </p>
        </div>

        <ListingForm
          onSubmit={handleSubmit}
          loading={saving}
          initialData={{
            title: listing.title,
            description: listing.description || '',
            sticker_number: listing.sticker_number || '',
            collection_name: listing.collection_name || '',
            image_url: listing.image_url || '',
          }}
        />
      </div>
    </div>
  );
}

export default function EditListingPage() {
  return (
    <AuthGuard>
      <EditListingContent />
    </AuthGuard>
  );
}
