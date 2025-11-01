'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useListing } from '@/hooks/marketplace/useListing';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Eye, Calendar, Edit, Trash } from 'lucide-react';
import {
  useUser,
  useSupabaseClient,
} from '@/components/providers/SupabaseProvider';
import { ReportButton } from '@/components/social/ReportButton';
import {
  resolveAvatarUrl,
  getAvatarFallback,
} from '@/lib/profile/resolveAvatarUrl';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const listingId = params.id as string;

  const { listing, loading, error, incrementViews, deleteListing } =
    useListing(listingId);

  const [hasConversations, setHasConversations] = useState(false);
  const [checkingConversations, setCheckingConversations] = useState(true);

  useEffect(() => {
    if (listing && user?.id && user.id !== listing.user_id) {
      incrementViews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id, user?.id]); // Only run when listing or user ID changes, incrementViews is stable

  // Check if listing has conversations
  useEffect(() => {
    async function checkConversations() {
      if (!listing || !user?.id || user.id !== listing.user_id) {
        setCheckingConversations(false);
        return;
      }

      try {
        const { data, error: participantsError } = await supabase.rpc(
          'get_listing_chat_participants',
          { p_listing_id: parseInt(listingId, 10) }
        );

        if (participantsError) {
          logger.error('Error checking conversations:', participantsError);
          setHasConversations(false);
        } else {
          setHasConversations(data && data.length > 0);
        }
      } catch (err) {
        logger.error('Error checking conversations:', err);
        setHasConversations(false);
      } finally {
        setCheckingConversations(false);
      }
    }

    void checkConversations();
  }, [listing, user, listingId, supabase]);

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este anuncio?')) return;

    try {
      await deleteListing();
      toast.success('Anuncio eliminado con éxito');
      router.push('/marketplace');
    } catch (error) {
      logger.error('Delete error:', error);
      toast.error('Error al eliminar el anuncio');
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
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#374151] border-2 border-black flex items-center justify-center">
            <Trash className="h-12 w-12 text-gray-500" />
          </div>
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

  const isOwner = user?.id === listing.user_id;
  const canContact = user && !isOwner && listing.status === 'active';

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Image */}
          <div>
            <ModernCard>
              <ModernCardContent className="p-0">
                <div className="relative aspect-square bg-[#374151]">
                  {listing.image_url ? (
                    <Image
                      src={listing.image_url}
                      alt={listing.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-9xl font-black text-gray-600">
                        {listing.title.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <Badge
                  className={`
                  ${listing.status === 'active' ? 'bg-green-500' : ''}
                  ${listing.status === 'sold' ? 'bg-gray-500' : ''}
                  ${listing.status === 'removed' ? 'bg-red-500' : ''}
                  text-white uppercase border-2 border-black
                `}
                >
                  {listing.status}
                </Badge>

                {isOwner && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/marketplace/${listing.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDelete}
                      className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <h1 className="text-3xl font-black text-white mb-4">
                {listing.title}
              </h1>

              {/* Basic Metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
                {listing.collection_name && (
                  <div>
                    <span className="font-bold">Colección:</span>{' '}
                    {listing.collection_name}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {listing.views_count} visualizaciones
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(listing.created_at).toLocaleDateString()}
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
                    <h3 className="font-bold text-white mb-3">
                      Detalles del Cromo
                    </h3>
                    <div className="space-y-2 text-sm">
                      {(listing.page_number || listing.page_title) && (
                        <div className="text-gray-300">
                          <span className="font-bold text-white">Página:</span>{' '}
                          {listing.page_number && `${listing.page_number}`}
                          {listing.page_number &&
                            listing.page_title &&
                            ' - '}
                          {listing.page_title}
                        </div>
                      )}
                      {(listing.sticker_number || listing.slot_variant) && (
                        <div className="text-gray-300">
                          <span className="font-bold text-white">
                            Número de cromo:
                          </span>{' '}
                          #{listing.sticker_number}
                          {listing.slot_variant}
                        </div>
                      )}
                      {listing.global_number && (
                        <div className="text-gray-300">
                          <span className="font-bold text-white">
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
                    <h3 className="font-bold text-white mb-2">Descripción</h3>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {listing.description}
                    </p>
                  </ModernCardContent>
                </ModernCard>
              )}

              {/* Seller */}
              <ModernCard className="mb-6">
                <ModernCardContent className="p-4">
                  <h3 className="font-bold text-white mb-3">Vendedor</h3>
                  <Link href={`/users/${listing.user_id}`}>
                    <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      {(() => {
                        const avatarUrl = resolveAvatarUrl(
                          listing.author_avatar_url,
                          supabase
                        );
                        const fallback = getAvatarFallback(
                          listing.author_nickname
                        );

                        return avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt={listing.author_nickname}
                            width={48}
                            height={48}
                            className="rounded-full border-2 border-black"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center text-black font-black text-lg ${fallback.gradientClass}`}
                          >
                            {fallback.initial}
                          </div>
                        );
                      })()}
                      <div>
                        <p className="font-bold text-white">
                          {listing.author_nickname}
                        </p>
                        <p className="text-sm text-gray-400">Ver perfil</p>
                      </div>
                    </div>
                  </Link>
                </ModernCardContent>
              </ModernCard>

              {/* Contact Button */}
              {canContact && (
                <Button
                  size="lg"
                  className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
                  asChild
                >
                  <Link href={`/marketplace/${listing.id}/chat`}>
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Contactar Vendedor
                  </Link>
                </Button>
              )}

              {isOwner && (
                <div className="text-center space-y-4">
                  <p className="text-gray-400 text-sm">Este es tu anuncio</p>
                  {hasConversations ? (
                    <Button
                      size="lg"
                      className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
                      asChild
                    >
                      <Link href={`/marketplace/${listing.id}/chat`}>
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Ver Conversaciones
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full bg-gray-600 text-gray-400 font-bold cursor-not-allowed"
                      disabled
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      {checkingConversations ? 'Cargando...' : 'Sin Conversaciones'}
                    </Button>
                  )}
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" asChild>
                      <Link href={`/marketplace/${listing.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Anuncio
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Eliminar Anuncio
                    </Button>
                  </div>
                </div>
              )}

              {!user && (
                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    <Link
                      href="/login"
                      className="text-[#FFC000] hover:underline"
                    >
                      Iniciar Sesión
                    </Link>{' '}
                    para contactar al vendedor
                  </p>
                </div>
              )}

              {/* Report Button */}
              {user && !isOwner && (
                <div className="pt-4 border-t border-gray-700">
                  <ReportButton
                    entityType="listing"
                    entityId={listing.id}
                    variant="outline"
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
