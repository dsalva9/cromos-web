'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, Edit, CheckCircle, AlertTriangle } from 'lucide-react';
import { useMarkSold } from '@/hooks/integration/useMarkSold';
import { toast } from 'sonner';
import { useState } from 'react';

interface MyListing {
  listing_id: string;
  title: string;
  description: string | null;
  collection_name: string | null;
  sticker_number: string | null;
  image_url: string | null;
  status: string;
  views_count: number;
  created_at: string;
  copy_id: string | null;
  current_count: number | null;
  needs_attention: boolean;
  // Panini metadata
  page_number?: number | null;
  page_title?: string | null;
  slot_variant?: string | null;
  global_number?: number | null;
}

interface MyListingCardProps {
  listing: MyListing;
  onUpdate: () => void;
}

export function MyListingCard({ listing, onUpdate }: MyListingCardProps) {
  const { markSold, loading } = useMarkSold();
  const [confirming, setConfirming] = useState(false);

  const handleMarkSold = async () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000); // Reset after 3 seconds
      return;
    }

    try {
      await markSold(listing.listing_id);
      toast.success('¡Anuncio marcado como completado!');
      if (listing.copy_id) {
        toast.success('Contador de repetidos actualizado automáticamente');
      }
      onUpdate();
    } catch {
      toast.error('Error al marcar como vendido');
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'sold':
        return 'Completado';
      case 'removed':
        return 'Eliminado';
      case 'reserved':
        return 'Reservado';
      default:
        return status;
    }
  };

  return (
    <ModernCard>
      <ModernCardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-4 p-4">
          {/* Image */}
          <div className="relative w-full md:w-32 h-32 bg-[#374151] rounded-md flex-shrink-0">
            {listing.image_url ? (
              <Image
                src={listing.image_url}
                alt={listing.title}
                fill
                className="object-cover rounded-md"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-4xl font-black text-gray-600">
                  {listing.title.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            {/* Title and Status */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link href={`/marketplace/${listing.listing_id}`}>
                  <h3 className="font-bold text-white text-lg hover:text-[#FFC000] transition-colors">
                    {listing.title}
                  </h3>
                </Link>
                {listing.collection_name && (
                  <p className="text-sm text-gray-400">{listing.collection_name}</p>
                )}
              </div>

              <Badge className={`
                ${listing.status === 'active' ? 'bg-green-500' : ''}
                ${listing.status === 'sold' ? 'bg-gray-500' : ''}
                ${listing.status === 'removed' ? 'bg-red-500' : ''}
                text-white uppercase flex-shrink-0
              `}>
                {getStatusLabel(listing.status)}
              </Badge>
            </div>

            {/* Alert if needs attention */}
            {listing.needs_attention && (
              <Alert className="bg-red-900/20 border-red-700">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">
                  Ya no tienes repetidos de este cromo. Considera eliminar este anuncio.
                </AlertDescription>
              </Alert>
            )}

            {/* Sync Info */}
            {listing.copy_id && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-900/20 border-blue-700 text-blue-200">
                  Sincronizado con Colección
                </Badge>
                {listing.current_count !== null && (
                  <span className="text-gray-400">
                    Repetidos actuales: <span className="font-bold text-white">{listing.current_count}</span>
                  </span>
                )}
              </div>
            )}

            {/* Panini Metadata */}
            {(listing.page_number || listing.page_title || listing.sticker_number || listing.slot_variant || listing.global_number) && (
              <div className="text-xs text-gray-400 space-y-1">
                {(listing.page_number || listing.page_title) && (
                  <div>
                    <span className="font-bold text-gray-300">Página:</span>{' '}
                    {listing.page_number && `${listing.page_number}`}
                    {listing.page_number && listing.page_title && ' - '}
                    {listing.page_title}
                  </div>
                )}
                {(listing.sticker_number || listing.slot_variant) && (
                  <div>
                    <span className="font-bold text-gray-300">Número de cromo:</span>{' '}
                    #{listing.sticker_number}{listing.slot_variant}
                  </div>
                )}
                {listing.global_number && (
                  <div>
                    <span className="font-bold text-gray-300">Número global:</span>{' '}
                    #{listing.global_number}
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {listing.views_count} vistas
              </div>
              <span>•</span>
              <span>Creado el {formatDate(listing.created_at)}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {listing.status === 'active' && (
                <>
                  <Link href={`/marketplace/${listing.listing_id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    onClick={handleMarkSold}
                    disabled={loading}
                    className="bg-green-700 hover:bg-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {confirming ? 'Haz clic de nuevo para confirmar' : 'Marcar como Completado'}
                  </Button>
                </>
              )}

              {listing.status === 'removed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = `/marketplace/${listing.listing_id}`}
                >
                  Reactivar
                </Button>
              )}
              
              {listing.status === 'sold' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = `/marketplace/${listing.listing_id}`}
                >
                  Reactivar
                </Button>
              )}
            </div>
          </div>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
