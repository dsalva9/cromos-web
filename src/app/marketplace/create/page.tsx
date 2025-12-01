'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SimplifiedListingForm } from '@/components/marketplace/SimplifiedListingForm';
import { useCreateListing } from '@/hooks/marketplace/useCreateListing';
import AuthGuard from '@/components/AuthGuard';
import { toast } from 'sonner';
import { CreateListingForm } from '@/types/v1.6.0';
import { logger } from '@/lib/logger';
import { ArrowLeft } from 'lucide-react';

function CreateListingContent() {
  const router = useRouter();
  const { createListing, loading } = useCreateListing();

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
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link
          href="/marketplace"
          className="inline-flex items-center text-[#FFC000] hover:text-[#FFD700] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Marketplace
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Publicar Anuncio
          </h1>
          <p className="text-gray-400">Comparte tu cromo con la comunidad</p>
        </div>

        <SimplifiedListingForm onSubmit={handleSubmit} loading={loading} />
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
