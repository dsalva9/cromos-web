'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, ArrowRight, ArrowLeft, Trash } from 'lucide-react';
import { ImageModal } from '@/components/ui/ImageModal';
import { useState } from 'react';
import { Listing } from '@/types/v1.6.0';

interface ListingDetailContentProps {
  listing: Listing | null;
  error?: string | null;
}

export function ListingDetailContent({ listing, error }: ListingDetailContentProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'hoy';
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7) return `hace ${diffDays}d`;
    return `hace ${diffDays}d`;
  };

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white dark:bg-gray-800 border-2 border-black flex items-center justify-center">
            <Trash className="h-12 w-12 text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Anuncio no encontrado
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Este anuncio puede haber sido eliminado o ya no está disponible'}
          </p>
          <Link href="/explorar">
            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
              Volver a Explorar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Hide removed/deleted listings from public view
  if (listing.status === 'ELIMINADO' || listing.status === 'removed') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white dark:bg-gray-800 border-2 border-black flex items-center justify-center">
            <Trash className="h-12 w-12 text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Anuncio no disponible
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Este anuncio ya no está disponible
          </p>
          <Link href="/explorar">
            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
              Volver a Explorar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Disponible';
      case 'sold':
        return 'Completado';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/explorar"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#FFC000] transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Image */}
          <div>
            <ModernCard>
              <ModernCardContent className="p-0">
                <div
                  className="relative min-h-[400px] bg-white dark:bg-gray-800 flex items-center justify-center rounded-lg overflow-hidden cursor-zoom-in"
                  onClick={() => listing.image_url && setImageModalOpen(true)}
                >
                  {listing.image_url ? (
                    <Image
                      src={listing.image_url}
                      alt={listing.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-contain"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-9xl font-black text-gray-600 dark:text-gray-400">
                        {listing.title.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              </ModernCardContent>
            </ModernCard>

            {listing.image_url && (
              <ImageModal
                isOpen={imageModalOpen}
                onClose={() => setImageModalOpen(false)}
                imageUrl={listing.image_url}
                alt={listing.title}
              />
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  className={`
                    ${listing.status === 'active' ? 'bg-green-500' : ''}
                    ${listing.status === 'sold' ? 'bg-gray-500' : ''}
                    text-white uppercase border-2 border-black
                  `}
                >
                  {getStatusLabel(listing.status)}
                </Badge>

                <Badge
                  className={`
                    ${listing.is_group ? 'bg-purple-600' : 'bg-blue-600'}
                    text-white border-2 border-black
                  `}
                >
                  {listing.is_group ? 'Pack de cromos' : 'Cromo individual'}
                </Badge>

                {(listing.listing_type === 'intercambio' || listing.listing_type === 'ambos') && (
                  <Badge className="bg-[#FFC000] text-black border-2 border-black">
                    🔄 Intercambio
                  </Badge>
                )}
                {(listing.listing_type === 'venta' || listing.listing_type === 'ambos') && (
                  <Badge className="bg-green-600 text-white border-2 border-black">
                    💰 Venta
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
                {listing.title}
              </h1>

              {/* Basic Metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
                {listing.collection_name && (
                  <div>
                    <span className="font-bold">Colección:</span>{' '}
                    <span className="text-[#FFC000]">{listing.collection_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Publicado {formatDate(listing.created_at)}
                </div>
              </div>

              {/* Panini Metadata Card */}
              {(listing.page_number ||
                listing.page_title ||
                listing.sticker_number ||
                listing.slot_variant ||
                listing.global_number) && (
                  <ModernCard className="mb-6">
                    <ModernCardContent className="p-4">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                        Detalles del Cromo
                      </h3>
                      <div className="space-y-2 text-sm">
                        {(listing.page_number || listing.page_title) && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-gray-900 dark:text-white">Página:</span>{' '}
                            {listing.page_number && `${listing.page_number}`}
                            {listing.page_number && listing.page_title && ' - '}
                            {listing.page_title}
                          </div>
                        )}
                        {(listing.sticker_number || listing.slot_variant) && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-gray-900 dark:text-white">
                              Número de cromo:
                            </span>{' '}
                            #{listing.sticker_number}
                            {listing.slot_variant}
                          </div>
                        )}
                        {listing.global_number && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-gray-900 dark:text-white">
                              Número global:
                            </span>{' '}
                            #{listing.global_number}
                          </div>
                        )}
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                )}

              {/* Description */}
              {listing.description && (
                <ModernCard className="mb-6">
                  <ModernCardContent className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">Descripción</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {listing.description}
                    </p>
                  </ModernCardContent>
                </ModernCard>
              )}

              {/* Listing Type Info Card */}
              <ModernCard className="mb-6">
                <ModernCardContent className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3">Tipo de Anuncio</h3>
                  <div className="space-y-2">
                    {(listing.listing_type === 'intercambio' || listing.listing_type === 'ambos') && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FFC000]/15">
                          <span className="text-base">🔄</span>
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          Disponible para <span className="font-semibold text-[#FFC000]">intercambio</span> con otros cromos
                        </span>
                      </div>
                    )}
                    {(listing.listing_type === 'venta' || listing.listing_type === 'ambos') && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
                          <span className="text-base">💰</span>
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          En venta por{' '}
                          <span className="font-bold text-green-600 dark:text-green-400 text-base">
                            {listing.price != null ? `${Number(listing.price).toFixed(2)} €` : '—'}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </ModernCardContent>
              </ModernCard>

              {/* Registration CTA */}
              <div className="bg-[#FFC000] rounded-xl p-6 text-center">
                <h3 className="text-xl font-black uppercase text-black mb-2">
                  ¿Te interesa este cromo?
                </h3>
                <p className="text-black/80 font-medium mb-4">
                  Regístrate gratis para contactar al vendedor e iniciar un intercambio
                </p>
                <Button
                  asChild
                  size="lg"
                  className="bg-black hover:bg-gray-800 text-white font-black text-lg h-14 px-10 border-2 border-transparent shadow-xl transition-all hover:scale-105 rounded-full"
                >
                  <Link href="/signup">
                    Crear Cuenta Gratis <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <p className="mt-3 text-black/60 text-sm">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login" className="font-bold text-black underline hover:no-underline">
                    Inicia Sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
