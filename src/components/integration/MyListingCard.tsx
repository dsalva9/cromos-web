'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import Link from '@/components/ui/link';
import { Eye, Edit, AlertTriangle, Trash2, Clock } from 'lucide-react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useSoftDeleteListing } from '@/hooks/marketplace/useSoftDeleteListing';
import { useHardDeleteListing } from '@/hooks/marketplace/useHardDeleteListing';
import { useRestoreListing } from '@/hooks/marketplace/useRestoreListing';
import { DeleteListingModal } from '@/components/marketplace/DeleteListingModal';
import { HardDeleteModal } from '@/components/marketplace/HardDeleteModal';
import { toast } from 'sonner';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DeletionCountdown } from '@/components/deletion';
import { logger } from '@/lib/logger';
import { DestacaAnuncioModal } from '@/components/marketplace/DestacaAnuncioModal';
import { useUser } from '@/components/providers/SupabaseProvider';

interface MyListing {
  listing_id: number;
  title: string;
  description: string | null;
  collection_name: string | null;
  sticker_number: string | null;
  image_url: string | null;
  status: string;
  views_count: number;
  created_at: string;
  copy_id: number | null;
  current_count: number | null;
  needs_attention: boolean;
  // Panini metadata
  page_number?: number | null;
  page_title?: string | null;
  slot_variant?: string | null;
  global_number?: number | null;
  // Group listing
  is_group?: boolean;
  group_count?: number;
  // Deletion metadata
  deleted_at?: string | null;
  scheduled_for?: string | null;
  // Expiration metadata
  expiry_scheduled_at?: string | null;
  expiry_warning_sent_at?: string | null;
  // Highlight
  is_highlighted?: boolean | null;
}

interface MyListingCardProps {
  listing: MyListing;
  onUpdate: () => void;
  onTabChange?: (status: 'active' | 'reserved' | 'completed' | 'removed' | 'ELIMINADO') => void;
}

export function MyListingCard({ listing, onUpdate, onTabChange }: MyListingCardProps) {
  const supabase = useSupabaseClient();
  const { softDeleteListing, loading: softDeleteLoading } = useSoftDeleteListing();
  const { hardDeleteListing, loading: hardDeleteLoading } = useHardDeleteListing();
  const { restoreListing, loading: restoreLoading } = useRestoreListing();
  const [showSoftDeleteModal, setShowSoftDeleteModal] = useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showDestacaModal, setShowDestacaModal] = useState(false);
  const { user } = useUser();

  const handleSoftDelete = async () => {
    try {
      await softDeleteListing(String(listing.listing_id));
      onUpdate(); // Refresh listings
      // Navigate to Eliminados tab after successful soft delete
      if (onTabChange) {
        onTabChange('ELIMINADO');
      }
    } catch (error) {
      // Error handling is done in hook
      logger.error('Soft delete failed:', error);
    }
  };

  const handleHardDelete = async () => {
    try {
      await hardDeleteListing(String(listing.listing_id));
      onUpdate(); // Refresh listings
    } catch (error) {
      // Error handling is done in hook
      logger.error('Hard delete failed:', error);
    }
  };

  const handleRestore = async () => {
    try {
      await restoreListing(String(listing.listing_id));
      onUpdate(); // Refresh listings
      // Navigate to Activos tab after successful restore
      if (onTabChange) {
        onTabChange('active');
      }
    } catch (error) {
      // Error handling is done in hook
      logger.error('Restore failed:', error);
    }
  };

  const handleReactivate = async () => {
    try {
      setReactivating(true);
      const { error } = await supabase.rpc('reactivate_listing', {
        p_listing_id: listing.listing_id,
      });
      if (error) throw error;
      toast.success('Anuncio reactivado correctamente');
      onUpdate();
    } catch (error) {
      logger.error('Reactivate failed:', error);
      toast.error('Error al reactivar el anuncio');
    } finally {
      setReactivating(false);
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
        // Only show badge for packs, not individual listings
        return listing.is_group ? 'Pack' : null;
      case 'sold':
        return 'Completado';
      case 'removed':
        return 'Eliminado';
      case 'ELIMINADO':
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
          <div className="relative w-full md:w-32 h-32 bg-white rounded-md flex-shrink-0">
            {listing.image_url ? (
              <Image
                src={listing.image_url}
                alt={listing.title}
                fill
                className="object-contain rounded-md"
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
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg hover:text-gold transition-colors">
                    {listing.title}
                  </h3>
                </Link>
                {listing.collection_name && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{listing.collection_name}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {listing.is_highlighted && (
                  <Badge className="bg-yellow-400 text-black border border-black font-black uppercase text-xs">
                    ⭐ Destacado
                  </Badge>
                )}
                {getStatusLabel(listing.status) && (
                  <Badge className={`
                    ${listing.status === 'active' && listing.is_group ? 'bg-blue-500' : ''}
                    ${listing.status === 'sold' ? 'bg-gray-500' : ''}
                    ${listing.status === 'removed' ? 'bg-red-500' : ''}
                    ${listing.status === 'ELIMINADO' ? 'bg-red-600' : ''}
                    ${listing.status === 'reserved' ? 'bg-yellow-500' : ''}
                    text-white uppercase flex-shrink-0
                  `}>
                    {getStatusLabel(listing.status)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Alert if needs attention */}
            {listing.needs_attention && (
              <Alert className="bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  Ya no tienes repetidos de este cromo. Considera eliminar este anuncio.
                </AlertDescription>
              </Alert>
            )}

            {/* Expiration Warning (active listings about to expire) */}
            {listing.status === 'active' && listing.expiry_scheduled_at && (
              <Alert className="bg-amber-100 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      Este anuncio se eliminará automáticamente el{' '}
                      <strong>{formatDate(listing.expiry_scheduled_at)}</strong>.{' '}
                      Haz clic en Reactivar para mantenerlo activo 30 días más.
                    </AlertDescription>
                    <Button
                      size="sm"
                      onClick={handleReactivate}
                      disabled={reactivating}
                      className="mt-2 bg-green-600 text-white hover:bg-green-700"
                      data-testid="reactivate-button"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {reactivating ? 'Reactivando...' : 'Reactivar'}
                    </Button>
                  </div>
                </div>
              </Alert>
            )}

            {/* Deletion Countdown */}
            {(listing.status === 'ELIMINADO' || listing.status === 'removed') && listing.deleted_at && listing.scheduled_for && (
              <Alert className="bg-yellow-900/20 border-yellow-700">
                <DeletionCountdown
                  deletedAt={listing.deleted_at}
                  scheduledFor={listing.scheduled_for}
                  entityType="listing"
                />
              </Alert>
            )}

            {/* Sync Info */}
            {listing.copy_id && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-200">
                  Sincronizado con Colección
                </Badge>
                {listing.current_count !== null && (
                  <span className="text-gray-600">
                    Repetidos actuales: <span className="font-bold text-gray-900">{listing.current_count}</span>
                  </span>
                )}
              </div>
            )}

            {/* Panini Metadata */}
            {(listing.page_number || listing.page_title || listing.sticker_number || listing.slot_variant || listing.global_number) && (
              <div className="text-xs text-gray-600 space-y-1">
                {(listing.page_number || listing.page_title) && (
                  <div>
                    <span className="font-bold text-gray-900">Página:</span>{' '}
                    {listing.page_number && `${listing.page_number}`}
                    {listing.page_number && listing.page_title && ' - '}
                    {listing.page_title}
                  </div>
                )}
                {(listing.sticker_number || listing.slot_variant) && (
                  <div>
                    <span className="font-bold text-gray-900">Número de cromo:</span>{' '}
                    #{listing.sticker_number}{listing.slot_variant}
                  </div>
                )}
                {listing.global_number && (
                  <div>
                    <span className="font-bold text-gray-900">Número global:</span>{' '}
                    #{listing.global_number}
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
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

                  {!listing.is_highlighted && user && (
                    <Button
                      size="sm"
                      onClick={() => setShowDestacaModal(true)}
                      className="bg-yellow-400 text-black hover:bg-yellow-300 border border-black font-bold"
                    >
                      ⭐ Destacar
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSoftDeleteModal(true)}
                    disabled={softDeleteLoading}
                    className="border-blue-500 text-blue-500 hover:bg-blue-50 hover:border-blue-600"
                    data-testid="soft-delete-button"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </>
              )}

              {(listing.status === 'ELIMINADO' || listing.status === 'removed') && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRestore}
                    disabled={restoreLoading}
                    className="border-green-500 text-green-500 hover:bg-green-50 hover:border-green-600"
                    data-testid="restore-button"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restaurar
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowHardDeleteModal(true)}
                    disabled={hardDeleteLoading}
                    className="border-red-700 text-red-700 hover:bg-red-50 hover:border-red-800"
                    data-testid="hard-delete-button"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Definitivamente
                  </Button>
                </>
              )}

              {/* Removed Reactivar button for sold/completed listings */}
              {/* Removed Eliminar button for reserved listings - no actions for reserved */}
            </div>

            {/* Soft Delete Confirmation Modal (for active listings) */}
            <DeleteListingModal
              isOpen={showSoftDeleteModal}
              onClose={() => setShowSoftDeleteModal(false)}
              onConfirm={handleSoftDelete}
              listing={{
                id: String(listing.listing_id),
                title: listing.title,
                status: listing.status,
                hasActiveChats: false, // Could be determined from chat data if needed
                hasActiveTransactions: listing.status === 'reserved'
              }}
              loading={softDeleteLoading}
            />

            {/* Hard Delete Confirmation Modal (for ELIMINADO listings) */}
            <HardDeleteModal
              isOpen={showHardDeleteModal}
              onClose={() => setShowHardDeleteModal(false)}
              onConfirm={handleHardDelete}
              listing={{
                id: String(listing.listing_id),
                title: listing.title,
                status: listing.status,
                hasActiveChats: false, // Could be determined from chat data if needed
                hasActiveTransactions: false // ELIMINADO listings shouldn't have active transactions
              }}
              loading={hardDeleteLoading}
            />
          </div>
        </div>
      </ModernCardContent>

      {/* Destacar Modal */}
      {user && (
        <DestacaAnuncioModal
          isOpen={showDestacaModal}
          onClose={() => setShowDestacaModal(false)}
          listingId={listing.listing_id}
          userId={user.id}
        />
      )}
    </ModernCard>
  );
}
