'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/hooks/use-router';
import { useListing } from '@/hooks/marketplace/useListing';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { IntlLink as Link } from '@/i18n/navigation';
import { MessageCircle, Eye, Calendar, Edit, Trash, Ban, Trash2, MapPin, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useUser,
  useSupabaseClient,
} from '@/components/providers/SupabaseProvider';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { ReportButton } from '@/components/social/ReportButton';
import { ListingFavoriteButton } from '@/components/marketplace/ListingFavoriteButton';
import {
  resolveAvatarUrl,
  getAvatarFallback,
} from '@/lib/profile/resolveAvatarUrl';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useSoftDeleteListing } from '@/hooks/marketplace/useSoftDeleteListing';
import { useRestoreListing } from '@/hooks/marketplace/useRestoreListing';
import { DeleteListingModal } from '@/components/marketplace/DeleteListingModal';
import { RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { ImageModal } from '@/components/ui/ImageModal';
import { getCurrencySymbol } from '@/constants/countries';
import { getSupportMailtoUrl, cn } from '@/lib/utils';
import { ShareButton } from '@/components/marketplace/ShareButton';
import { DestacaAnuncioModal } from '@/components/marketplace/DestacaAnuncioModal';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('marketplaceDetails');
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const listingId = params.id as string;

  const { listing, loading, error, incrementViews, refetch } =
    useListing(listingId);
  const { softDeleteListing, loading: deleteLoading } = useSoftDeleteListing();
  const { restoreListing, loading: restoreLoading } = useRestoreListing();

  const [hasConversations, setHasConversations] = useState(false);
  const [checkingConversations, setCheckingConversations] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { isAdmin } = useProfileCompletion();
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const viewIncrementedRef = useRef<string | null>(null);
  const [ignoringListing, setIgnoringListing] = useState(false);
  const [showIgnoreConfirm, setShowIgnoreConfirm] = useState(false);
  const [showDestacaModal, setShowDestacaModal] = useState(false);

  useEffect(() => {
    if (listing && user?.id && user.id !== listing.user_id && viewIncrementedRef.current !== listing.id.toString()) {
      viewIncrementedRef.current = listing.id.toString();
      incrementViews();
    }
  }, [listing, user?.id, incrementViews]);

  const [showAdminDeleteDialog, setShowAdminDeleteDialog] = useState(false);
  const [adminDeleteReason, setAdminDeleteReason] = useState('');
  const [adminDeleteLoading, setAdminDeleteLoading] = useState(false);

  const handleIgnoreListing = async () => {
    if (!listing) return;
    setIgnoringListing(true);
    try {
      const { error } = await supabase.rpc('ignore_listing', {
        p_listing_id: listing.id,
      });
      if (error) throw error;
      toast.success(t('ignoreListing.success'));
      router.push('/marketplace');
    } catch (err) {
      logger.error('Error ignoring listing:', err);
      toast.error(t('ignoreListing.error'));
    } finally {
      setIgnoringListing(false);
    }
  };

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
          const errMsg = String(participantsError.message || '').toLowerCase();
          const isExpected = errMsg.includes('listing not found') || errMsg.includes('not authenticated') || errMsg.includes('jwt');
          if (isExpected) {
            logger.warnLocal('Expected error checking conversations:', participantsError.message);
          } else {
            logger.error('Error checking conversations:', participantsError);
          }
          setHasConversations(false);
        } else {
          setHasConversations(data && data.length > 0);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
        const isExpected = errMsg.includes('listing not found') || errMsg.includes('not authenticated') || errMsg.includes('jwt');
        if (isExpected) {
          logger.warnLocal('Expected error checking conversations:', err);
        } else {
          logger.error('Error checking conversations:', err);
        }
        setHasConversations(false);
      } finally {
        setCheckingConversations(false);
      }
    }

    void checkConversations();
  }, [listing, user, listingId, supabase]);

  const handleSoftDelete = async () => {
    try {
      await softDeleteListing(listingId);
      toast.success(t('moveToDeleted'));
      router.push('/marketplace/my-listings?tab=ELIMINADO');
    } catch (error) {
      logger.error('Delete error:', error);
      // Error already handled by hook
    }
  };

  const handleAdminDelete = async () => {
    if (!adminDeleteReason.trim()) {
      toast.error(t('pleaseEnterReason'));
      return;
    }

    setAdminDeleteLoading(true);
    try {
      const { error } = await supabase.rpc('admin_delete_listing', {
        p_listing_id: parseInt(listingId, 10),
        p_reason: adminDeleteReason
      });

      if (error) throw error;

      toast.success(t('adminDeleteSuccess'));
      setShowAdminDeleteDialog(false);
      setAdminDeleteReason('');
      refetch(); // Refresh to show deleted state
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Admin delete error: ${errMsg}`, error);
      toast.error(errMsg || t('adminDeleteError'));
    } finally {
      setAdminDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white dark:bg-gray-800 border-2 border-black flex items-center justify-center">
            <Trash className="h-12 w-12 text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('notFound')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error ||
              t('notFoundDesc')}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('contactSupport')}{' '}
            <a
              href={getSupportMailtoUrl()}
              className="text-gold hover:text-yellow-400 underline"
            >
              soporte@cambiocromos.com
            </a>
          </p>
          <Link href="/marketplace">
            <Button className="bg-gold text-black hover:bg-gold-light font-bold">
              Volver al Marketplace
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === listing.user_id;
  const canContact = user && !isOwner && listing.status === 'active';

  // Hide ELIMINADO/removed listings from non-owners (except admins)
  if ((listing.status === 'ELIMINADO' || listing.status === 'removed') && !isOwner && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white dark:bg-gray-800 border-2 border-black flex items-center justify-center">
            <Trash className="h-12 w-12 text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('notFound')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('notFoundDesc')}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('contactSupport')}{' '}
            <a
              href={getSupportMailtoUrl()}
              className="text-gold hover:text-yellow-400 underline"
            >
              soporte@cambiocromos.com
            </a>
          </p>
          <Link href="/marketplace">
            <Button className="bg-gold text-black hover:bg-gold-light font-bold">
              {t('backToMarketplace')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('statusAvailable');
      case 'reserved':
        return t('statusReserved');
      case 'completed':
        return t('statusCompleted');
      case 'sold':
        return t('statusCompleted');
      case 'removed':
        return t('statusDeleted');
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Image */}
          <div className={cn(
            listing.is_highlighted
              ? "rounded-xl ring-4 ring-amber-400/60 shadow-[0_0_32px_rgba(245,158,11,0.35)] dark:shadow-[0_0_32px_rgba(245,158,11,0.2)]"
              : ""
          )}>
            <ModernCard>
              <ModernCardContent className="p-0">
                {/* Golden top strip for highlighted listings */}
                {listing.is_highlighted && (
                  <div className="h-[3px] bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 w-full" />
                )}
                <div
                  className={cn(
                    "relative min-h-[400px] flex items-center justify-center rounded-lg overflow-hidden cursor-zoom-in",
                    listing.is_highlighted
                      ? "bg-gradient-to-br from-amber-50 via-yellow-50/60 to-white dark:from-amber-950/30 dark:via-gray-900 dark:to-gray-800"
                      : "bg-white dark:bg-gray-800"
                  )}
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
          <div className={cn(
            "space-y-6",
            listing.is_highlighted
              ? "rounded-xl p-1 bg-gradient-to-br from-amber-50/60 via-yellow-50/20 to-transparent dark:from-amber-950/20 dark:via-transparent dark:to-transparent"
              : ""
          )}>
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={`
                    ${listing.status === 'active' ? 'bg-green-500' : ''}
                    ${listing.status === 'reserved' ? 'bg-yellow-500' : ''}
                    ${listing.status === 'completed' ? 'bg-blue-500' : ''}
                    ${listing.status === 'sold' ? 'bg-gray-500' : ''}
                    ${listing.status === 'removed' ? 'bg-red-500' : ''}
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
                    {listing.is_group ? t('pack') : t('single')}
                  </Badge>

                  {/* Listing Type Badges */}
                  {(listing.listing_type === 'intercambio' || listing.listing_type === 'ambos') && (
                    <Badge className="bg-gold text-black border-2 border-black">
                      🔄 {t('exchange')}
                    </Badge>
                  )}
                  {(listing.listing_type === 'venta' || listing.listing_type === 'ambos') && (
                    <Badge className="bg-green-600 text-white border-2 border-black">
                      💰 {t('sale')}
                    </Badge>
                  )}

                  {/* Destacado Badge */}
                  {listing.is_highlighted && (
                    <Badge className="bg-yellow-400 text-black border-2 border-black font-black uppercase flex items-center gap-1">
                      ⭐ Destacado
                    </Badge>
                  )}

                  {/* Suspension Badge - Only visible to admins, hidden if author deleted or listing removed */}
                  {isAdmin && listing.author_is_suspended && !listing.author_deleted_at && listing.status !== 'removed' && (
                    <Badge className="bg-red-900 text-red-200 border-2 border-red-700 flex items-center gap-1">
                      <Ban className="h-3 w-3" />
                      {t('authorSuspended')}
                    </Badge>
                  )}

                  {/* Author Deletion Badge - Only visible to admins, hidden if listing removed */}
                  {isAdmin && listing.author_deleted_at && listing.status !== 'removed' && (
                    <Badge className="bg-orange-900 text-orange-200 border-2 border-orange-700 flex items-center gap-1">
                      <Trash2 className="h-3 w-3" />
                      {t('authorDeleted')}
                    </Badge>
                  )}

                  {/* Listing Deleted Badge - Only visible to admins */}
                  {isAdmin && listing.deleted_at && (
                    <Badge className="bg-red-600 text-white border-2 border-red-800 flex items-center gap-1">
                      <Trash2 className="h-3 w-3" />
                      {t('deleted')}
                    </Badge>
                  )}
                </div>

                {(isOwner || isAdmin) && listing.status === 'active' && (
                  <div className="flex gap-2">
                    {isOwner && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/marketplace/${listing.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => isAdmin && !isOwner ? setShowAdminDeleteDialog(true) : setShowDeleteModal(true)}
                      className="text-blue-500 border-blue-500 hover:bg-blue-500 hover:text-white"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
                {listing.title}
              </h1>

              {/* Basic Metadata */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
                {listing.collection_name && (
                  <div>
                    <span className="font-bold">{t('collection')}:</span>{' '}
                    <Link
                      href={`/templates?search=${encodeURIComponent(listing.collection_name)}`}
                      className="text-gold hover:underline"
                    >
                      {listing.collection_name}
                    </Link>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {listing.views_count} {t('views')}
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
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                        {t('details')}
                      </h3>
                      <div className="space-y-2 text-sm">
                        {(listing.page_number || listing.page_title) && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-gray-900 dark:text-white">{t('page')}:</span>{' '}
                            {listing.page_number && `${listing.page_number}`}
                            {listing.page_number &&
                              listing.page_title &&
                              ' - '}
                            {listing.page_title}
                          </div>
                        )}
                        {(listing.sticker_number || listing.slot_variant) && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {t('stickerNumber')}:
                            </span>{' '}
                            #{listing.sticker_number}
                            {listing.slot_variant}
                          </div>
                        )}
                        {listing.global_number && (
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {t('globalNumber')}:
                            </span>{' '}
                            #{listing.global_number}
                          </div>
                        )}
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                )}

              {/* Destacar button — owner only, active, not yet highlighted */}
              {isOwner && listing.status === 'active' && !listing.is_highlighted && (
                <button
                  onClick={() => setShowDestacaModal(true)}
                  className="w-full mb-6 py-3 px-4 rounded-lg border-2 border-yellow-400 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300 font-bold text-sm hover:bg-yellow-400/20 transition-colors flex items-center justify-center gap-2"
                >
                  ⭐ Destacar este anuncio
                </button>
              )}

              {/* Description */}
              {listing.description && (
                <ModernCard className="mb-6">
                  <ModernCardContent className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('description')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {listing.description}
                    </p>
                  </ModernCardContent>
                </ModernCard>
              )}

              {/* Listing Type Info Card */}
              <ModernCard className="mb-6">
                <ModernCardContent className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3">{t('listingType')}</h3>
                  <div className="space-y-2">
                    {(listing.listing_type === 'intercambio' || listing.listing_type === 'ambos') && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold/15">
                          <span className="text-base">🔄</span>
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {t('availableForExchange')}
                        </span>
                      </div>
                    )}
                    {(listing.listing_type === 'venta' || listing.listing_type === 'ambos') && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30">
                          <span className="text-base">💰</span>
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {t('forSale')}{' '}
                          <span className="font-bold text-green-600 dark:text-green-400 text-base">
                            {listing.price != null ? `${Number(listing.price).toFixed(2)} ${getCurrencySymbol(listing.author_country_code)}` : '—'}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </ModernCardContent>
              </ModernCard>

              {/* Seller */}
              <ModernCard className={cn("mb-6", listing.author_is_patron && "border-amber-300 dark:border-amber-900/50 shadow-[0_0_12px_rgba(245,158,11,0.08)] bg-gradient-to-r from-amber-50/10 to-transparent dark:from-amber-950/5")}>
                <ModernCardContent className="p-4">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3">{t('seller')}</h3>
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
                            className={cn(
                              "rounded-full border-2",
                              listing.author_is_patron
                                ? "border-amber-400 ring-2 ring-amber-400/50"
                                : "border-black"
                            )}
                          />
                        ) : (
                          <div
                            className={cn(
                              "w-12 h-12 rounded-full border-2 flex items-center justify-center text-black font-black text-lg",
                              listing.author_is_patron
                                ? "border-amber-400 ring-2 ring-amber-400/50"
                                : "border-black",
                              fallback.gradientClass
                            )}
                          >
                            {fallback.initial}
                          </div>
                        );
                      })()}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {listing.author_nickname}
                          </p>
                          {listing.author_is_patron && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-sm whitespace-nowrap shrink-0"
                              title="Patrón de CambioCromos"
                            >
                              ☕
                            </span>
                          )}
                          {listing.author_completed_trades && listing.author_completed_trades > 0 ? (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 shadow-sm whitespace-nowrap shrink-0"
                              title={`${listing.author_completed_trades} intercambios completados`}
                            >
                              ⭐ {listing.author_completed_trades}
                            </span>
                          ) : null}
                        </div>
                        {listing.author_location && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {listing.author_location}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{t('viewProfile')}</p>
                      </div>
                    </div>
                  </Link>
                </ModernCardContent>
              </ModernCard>

              {/* Contact Button */}
              {canContact && (
                <Button
                  size="lg"
                  className="w-full bg-gold text-black hover:bg-gold-light font-bold"
                  asChild
                >
                  <Link href={`/marketplace/${listing.id}/chat`}>
                    <MessageCircle className="mr-2 h-5 w-5" />
                    {t('contactSeller')}
                  </Link>
                </Button>
              )}

              {/* Favorite Button - shown to all authenticated non-owners */}
              {user && !isOwner && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                  <ListingFavoriteButton listingId={listing.id} variant="full" className="h-10 md:h-12 w-full text-xs md:text-sm px-1.5 md:px-3" />
                  <ShareButton
                    listingId={listing.id}
                    listingTitle={listing.title}
                    collectionName={listing.collection_name}
                    variant="full"
                    className="h-10 md:h-12 w-full text-xs md:text-sm px-1.5 md:px-3"
                  />
                  <ReportButton
                    entityType="listing"
                    entityId={String(listing.id)}
                    variant="outline"
                    size="default"
                    className="h-10 md:h-12 w-full text-xs md:text-sm px-1.5 md:px-3"
                  />
                  <Button
                    variant="outline"
                    size="default"
                    className="h-10 md:h-12 w-full text-xs md:text-sm px-1.5 md:px-3"
                    onClick={() => setShowIgnoreConfirm(true)}
                    disabled={ignoringListing}
                    title={t('ignoreListing.button')}
                  >
                    <EyeOff className="h-4 w-4 mr-1 md:mr-2" />
                    <span>{t('ignoreListing.button')}</span>
                  </Button>
                </div>
              )}

              {isOwner && (
                <div className="text-center space-y-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{t('yourListing')}</p>
                  <ShareButton
                    listingId={listing.id}
                    listingTitle={listing.title}
                    collectionName={listing.collection_name}
                    variant="full"
                    className="w-full"
                  />
                  {hasConversations ? (
                    <Button
                      size="lg"
                      className="w-full bg-gold text-black hover:bg-gold-light font-bold"
                      asChild
                    >
                      <Link href={`/marketplace/${listing.id}/chat`}>
                        <MessageCircle className="mr-2 h-5 w-5" />
                        {t('viewConversations')}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full bg-gray-600 text-gray-400 font-bold cursor-not-allowed"
                      disabled
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      {checkingConversations ? t('loading') : t('noConversations')}
                    </Button>
                  )}

                  <div className="flex gap-4 justify-center flex-wrap">
                    {(listing.status === 'removed' || listing.status === 'ELIMINADO') ? (
                      // Show Restaurar button for soft-deleted listings
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={async () => {
                          try {
                            await restoreListing(listingId);
                            toast.success(t('restoreSuccess'));
                            window.location.reload();
                          } catch (err) {
                            logger.error('Error restoring listing:', err);
                            toast.error(t('restoreError'));
                          }
                        }}
                        disabled={restoreLoading}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {t('restoreListing')}
                      </Button>
                    ) : (listing.status === 'sold' || listing.status === 'completed' || listing.status === 'reserved') ? (
                      // No action buttons for completed/sold/reserved listings
                      null
                    ) : (
                      // Show Edit button for active listings
                      <Button variant="outline" asChild>
                        <Link href={`/marketplace/${listing.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('editListing')}
                        </Link>
                      </Button>
                    )}

                    {listing.status === 'active' && (isOwner || isAdmin) && (
                      <Button
                        variant="outline"
                        onClick={() => isAdmin && !isOwner ? setShowAdminDeleteDialog(true) : setShowDeleteModal(true)}
                        className="text-blue-500 border-blue-500 hover:bg-blue-500 hover:text-white"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        {t('deleteListing')}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!user && (
                <div className="text-center">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    <Link
                      href="/login"
                      className="text-gold hover:underline"
                    >
                      {t('loginToContact')}
                    </Link>{' '}
                    {t('toContact')}
                  </p>
                </div>
              )}

              {/* Report Button */}

            </div>
          </div>
        </div>
      </div>

      {/* Destacar Modal (for owners) */}
      {user && isOwner && (
        <DestacaAnuncioModal
          open={showDestacaModal}
          onClose={() => setShowDestacaModal(false)}
          listingId={listing.id}
          userId={user.id}
        />
      )}

      {/* Soft Delete Modal (for owners) */}
      <DeleteListingModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleSoftDelete}
        listing={{
          id: String(listing.id),
          title: listing.title,
          status: listing.status,
        }}
        loading={deleteLoading}
      />

      {/* Admin Delete Dialog */}
      <Dialog open={showAdminDeleteDialog} onOpenChange={setShowAdminDeleteDialog}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>{t('adminDeleteTitle')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {listing.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <label className="text-sm font-medium text-slate-300">
              {t('adminDeleteReason')}
            </label>
            <Textarea
              value={adminDeleteReason}
              onChange={(e) => setAdminDeleteReason(e.target.value)}
              placeholder={t('adminDeletePlaceholder')}
              rows={3}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-400 mt-2">
              {t('adminDeleteWarning')}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdminDeleteDialog(false);
                setAdminDeleteReason('');
              }}
              disabled={adminDeleteLoading}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleAdminDelete}
              disabled={adminDeleteLoading || !adminDeleteReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {adminDeleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                <>{t('confirmDelete')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Listing Confirmation Dialog */}
      <Dialog open={showIgnoreConfirm} onOpenChange={setShowIgnoreConfirm}>
        <DialogContent className="bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle>{t('ignoreListing.confirmTitle')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t('ignoreListing.confirmDescription')}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowIgnoreConfirm(false)}
              disabled={ignoringListing}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              {t('ignoreListing.cancelButton')}
            </Button>
            <Button
              onClick={() => {
                setShowIgnoreConfirm(false);
                void handleIgnoreListing();
              }}
              disabled={ignoringListing}
              className="bg-red-600 hover:bg-red-700"
            >
              {ignoringListing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('ignoreListing.confirmButton')}
                </>
              ) : (
                <>{t('ignoreListing.confirmButton')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
