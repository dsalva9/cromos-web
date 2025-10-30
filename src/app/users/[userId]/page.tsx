'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/social/useUserProfile';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { FavoriteButton } from '@/components/social/FavoriteButton';
import { ReportButton } from '@/components/social/ReportButton';
import {
  useUser,
  useSupabaseClient,
} from '@/components/providers/SupabaseProvider';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { User, Star, Heart, Package, MapPin, Pencil } from 'lucide-react';
import {
  AvatarPicker,
  AvatarSelection,
} from '@/components/profile/AvatarPicker';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';

const STATUS_LABELS = {
  active: 'Activos',
  sold: 'Completados',
  removed: 'Eliminados',
} as const;

type ListingFilter = keyof typeof STATUS_LABELS;

const emptyStateCopy: Record<ListingFilter, string> = {
  active: 'No hay anuncios activos',
  sold: 'No hay anuncios completados',
  removed: 'No hay anuncios eliminados',
};

const postcodeRegex = /^\d{4,5}$/;

interface Rating {
  id: number;
  rater_id: string;
  rater_nickname: string;
  rater_avatar_url: string | null;
  rating: number;
  comment: string | null;
  context_type: string;
  context_id: number;
  created_at: string;
}

interface RatingDistribution {
  '5_star': number;
  '4_star': number;
  '3_star': number;
  '2_star': number;
  '1_star': number;
}

interface RatingSummary {
  rating_avg: number;
  rating_count: number;
  rating_distribution: RatingDistribution;
}

export default function UserProfilePage() {
  const params = useParams();
  const { user: currentUser } = useUser();
  const supabase = useSupabaseClient();
  const { updateProfile: updateCompletionProfile, refresh: refreshCompletion } =
    useProfileCompletion();
  const userId = params.userId as string;

  const { profile, listings, loading, error, refetch, adjustFavoritesCount } =
    useUserProfile(userId);

  const [listingFilter, setListingFilter] = useState<ListingFilter>('active');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formNickname, setFormNickname] = useState('');
  const [formPostcode, setFormPostcode] = useState('');
  const [formAvatarPath, setFormAvatarPath] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<{
    blob: Blob;
    fileName: string;
  } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Ratings state
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFormNickname(
      profile.nickname && profile.nickname !== 'Sin nombre'
        ? profile.nickname
        : ''
    );
    setFormPostcode(profile.postcode ?? '');
    setFormAvatarPath(profile.avatar_url ?? null);
    setAvatarBlob(null);
  }, [profile, editDialogOpen]);

  // Fetch ratings
  useEffect(() => {
    async function fetchRatings() {
      if (!userId) return;

      setLoadingRatings(true);
      try {
        // Fetch rating summary
        const { data: summaryData, error: summaryError } = await supabase.rpc(
          'get_user_rating_summary',
          { p_user_id: userId }
        );

        if (summaryError) throw summaryError;
        if (summaryData && summaryData.length > 0) {
          setRatingSummary(summaryData[0]);
        }

        // Fetch ratings (limit to 50 most recent)
        const { data: ratingsData, error: ratingsError } = await supabase.rpc(
          'get_user_ratings',
          { p_user_id: userId, p_limit: 50, p_offset: 0 }
        );

        if (ratingsError) throw ratingsError;
        setRatings(ratingsData || []);
      } catch (err) {
        logger.error('Error fetching ratings:', err);
      } finally {
        setLoadingRatings(false);
      }
    }

    void fetchRatings();
  }, [userId, supabase]);

  const displayAvatarUrl = useMemo(
    () => resolveAvatarUrl(profile?.avatar_url ?? null, supabase),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.avatar_url]
  );

  const previewAvatarUrl = useMemo(
    () => resolveAvatarUrl(formAvatarPath, supabase),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formAvatarPath]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<ListingFilter, number> = {
      active: 0,
      sold: 0,
      removed: 0,
    };
    listings.forEach(listing => {
      const status = listing.status as ListingFilter;
      if (status in counts) {
        counts[status] += 1;
      }
    });
    return counts;
  }, [listings]);

  const isOwnProfile = currentUser?.id === userId;
  const availableStatuses = useMemo<ListingFilter[]>(
    () => (isOwnProfile ? ['active', 'sold', 'removed'] : ['active']),
    [isOwnProfile]
  );

  useEffect(() => {
    if (!availableStatuses.includes(listingFilter)) {
      setListingFilter(availableStatuses[0]);
    }
  }, [availableStatuses, listingFilter]);

  const filteredListings = useMemo(
    () =>
      listings.filter(
        listing =>
          availableStatuses.includes(listing.status as ListingFilter) &&
          listing.status === listingFilter
      ),
    [listings, listingFilter, availableStatuses]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Usuario no encontrado</p>
        </div>
      </div>
    );
  }

  const emailDisplay = isOwnProfile ? (currentUser?.email ?? null) : null;

  const locationDisplay = profile.location_label
    ? profile.postcode
      ? `${profile.location_label} (${profile.postcode})`
      : profile.location_label
    : profile.postcode
      ? `CP ${profile.postcode}`
      : null;

  const listingTabs = availableStatuses.map(status => ({
    value: status,
    label: STATUS_LABELS[status],
    badge: (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/10 border border-black/30">
        {statusCounts[status]}
      </span>
    ),
  }));

  const handleAvatarSelection = async (selection: AvatarSelection) => {
    if (selection.type === 'preset') {
      // Preset avatar - just store the public path
      setFormAvatarPath(selection.value);
      setAvatarBlob(null);
    } else if (selection.type === 'upload') {
      // Uploaded image - store blob for later upload
      setAvatarBlob({ blob: selection.value, fileName: selection.fileName });
      // Create temporary preview
      const previewUrl = URL.createObjectURL(selection.value);
      setFormAvatarPath(previewUrl);
    } else if (selection.type === 'remove') {
      setFormAvatarPath(null);
      setAvatarBlob(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    const trimmedNickname = formNickname.trim();
    const trimmedPostcode = formPostcode.trim();

    if (!trimmedNickname) {
      toast.error('El usuario es obligatorio');
      return;
    }

    if (trimmedNickname.toLowerCase() === 'sin nombre') {
      toast.error('Elige un usuario distinto a "Sin nombre"');
      return;
    }

    if (!trimmedPostcode) {
      toast.error('El código postal es obligatorio');
      return;
    }

    if (!postcodeRegex.test(trimmedPostcode)) {
      toast.error('Introduce un código postal válido');
      return;
    }

    try {
      setSavingProfile(true);

      const { data: existingNickname, error: nicknameError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('nickname', trimmedNickname)
        .neq('id', currentUser.id)
        .maybeSingle();

      if (nicknameError) {
        throw nicknameError;
      }

      if (existingNickname) {
        toast.error('Ese usuario ya está en uso. Prueba con otro.');
        return;
      }

      let finalAvatarPath = formAvatarPath;

      // Upload avatar blob if exists
      if (avatarBlob) {
        setUploadingAvatar(true);
        const storagePath = `avatars/${currentUser.id}/${avatarBlob.fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(storagePath, avatarBlob.blob, {
            upsert: true,
            cacheControl: '3600',
            contentType: 'image/webp',
          });

        if (uploadError) throw uploadError;

        finalAvatarPath = storagePath;
        setUploadingAvatar(false);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname: trimmedNickname,
          postcode: trimmedPostcode,
          avatar_url: finalAvatarPath,
        })
        .eq('id', currentUser.id);

      if (updateError) {
        if ('code' in updateError && updateError.code === '23505') {
          toast.error('Ese usuario ya está en uso. Prueba con otro.');
          return;
        }
        throw updateError;
      }

      toast.success('Perfil actualizado');
      setEditDialogOpen(false);
      if (isOwnProfile) {
        updateCompletionProfile({
          nickname: trimmedNickname,
          postcode: trimmedPostcode,
        });
        void refreshCompletion();
      }
      await refetch();
    } catch (updateErr) {
      logger.error('Profile update failed', updateErr);

      // Handle specific postcode validation errors
      if (updateErr && typeof updateErr === 'object' && 'message' in updateErr) {
        const errorMessage = String(updateErr.message);

        // Check if it's a postcode validation error from the database
        if (errorMessage.includes('codigo postal') || errorMessage.includes('postcode')) {
          toast.error(errorMessage);
          return;
        }
      }

      toast.error('No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
      setUploadingAvatar(false);
    }
  };

  const renderStatCard = (
    icon: React.ReactElement,
    value: number | string,
    label: string,
    href?: string
  ) => {
    const card = (
      <div className="text-center">
        {icon}
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    );

    if (!href) return card;

    return (
      <Link
        href={href}
        className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-transform hover:scale-[1.02]"
      >
        {card}
      </Link>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? 'fill-[#FFC000] text-[#FFC000]'
                : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingBar = (count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden border border-black">
          <div
            className="h-full bg-[#FFC000] transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-400 font-bold min-w-[3rem] text-right">
          {count}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="mb-8 rounded-lg border-2 border-black bg-[#374151] shadow-lg transition-all duration-300 hover:shadow-xl">
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {displayAvatarUrl ? (
                    <Image
                      src={displayAvatarUrl}
                      alt={profile.nickname}
                      width={120}
                      height={120}
                      className="rounded-full border-4 border-black object-cover"
                    />
                  ) : (
                    <div className="w-30 h-30 rounded-full bg-[#FFC000] border-4 border-black flex items-center justify-center">
                      <User className="h-16 w-16 text-black" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                    <div>
                      <h1 className="text-3xl font-black text-white mb-2">
                        {profile.nickname}
                      </h1>

                      {/* Email & Location */}
                      {emailDisplay && (
                        <p className="text-white/80 text-sm md:text-base">
                          {emailDisplay}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-300 mt-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {locationDisplay ??
                            (isOwnProfile
                              ? 'A├▒ade tu c├│digo postal para mostrar tu ubicaci├│n aproximada'
                              : 'Ubicaci├│n no disponible')}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mt-3">
                        <a
                          href="#valoraciones"
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('valoraciones')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 fill-[#FFC000] text-[#FFC000]" />
                            <span className="text-white font-bold text-lg">
                              {profile.rating_avg.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-gray-400 hover:text-[#FFC000] transition-colors">
                            ({profile.rating_count}{' '}
                            {profile.rating_count === 1
                              ? 'valoraci├│n'
                              : 'valoraciones'}
                            )
                          </span>
                        </a>
                      </div>

                      {/* Badges */}
                      <div className="flex gap-2 mt-3">
                        {profile.is_admin && (
                          <Badge className="bg-red-600 text-white">
                            Administrador
                          </Badge>
                        )}
                        {profile.is_suspended && (
                          <Badge className="bg-gray-600 text-white">
                            Suspendido
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isOwnProfile && currentUser && (
                        <div className="flex items-center gap-3">
                          <FavoriteButton
                            userId={userId}
                            onFavoriteDelta={adjustFavoritesCount}
                          />
                          <ReportButton
                            entityType="user"
                            entityId={userId}
                            variant="outline"
                            size="sm"
                          />
                        </div>
                      )}

                      {isOwnProfile && (
                        <Dialog
                          open={editDialogOpen}
                          onOpenChange={setEditDialogOpen}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-2 border-black text-white bg-[#1F2937] hover:bg-[#FFC000] hover:text-gray-900"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar perfil
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="space-y-4 max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Editar perfil</DialogTitle>
                              <DialogDescription>
                                Actualiza tu avatar, usuario y ubicación
                                aproximada.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                              <div className="space-y-3">
                                <Label>Avatar</Label>
                                <AvatarPicker
                                  currentAvatarUrl={previewAvatarUrl}
                                  onSelect={handleAvatarSelection}
                                  uploading={uploadingAvatar}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="nickname">Usuario</Label>
                                <Input
                                  id="nickname"
                                  value={formNickname}
                                  onChange={event =>
                                    setFormNickname(event.target.value)
                                  }
                                  maxLength={50}
                                  placeholder="Tu usuario"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="postcode">Código postal</Label>
                                <Input
                                  id="postcode"
                                  value={formPostcode}
                                  onChange={event =>
                                    setFormPostcode(event.target.value)
                                  }
                                  maxLength={5}
                                  placeholder="28001"
                                  required
                                  inputMode="numeric"
                                />
                                <p className="text-xs text-gray-400">
                                  Mostramos tu ubicación aproximada en base al
                                  código postal.
                                </p>
                              </div>
                            </div>

                            <DialogFooter className="sm:justify-between">
                              <Button
                                variant="outline"
                                className="border-2 border-black text-white bg-[#1F2937] hover:bg-[#FFC000] hover:text-gray-900"
                                onClick={() => setEditDialogOpen(false)}
                                type="button"
                                disabled={savingProfile}
                              >
                                Cancelar
                              </Button>
                              <Button
                                className="bg-[#FFC000] text-gray-900 border-2 border-black hover:bg-yellow-400"
                                onClick={handleSaveProfile}
                                type="button"
                                disabled={savingProfile || uploadingAvatar}
                              >
                                {savingProfile
                                  ? 'Guardando...'
                                  : 'Guardar cambios'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    {renderStatCard(
                      <Package className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />,
                      statusCounts.active,
                      'Anuncios activos',
                      isOwnProfile ? '/marketplace/my-listings' : undefined
                    )}

                    {renderStatCard(
                      <Heart className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />,
                      profile.favorites_count,
                      'Favoritos',
                      isOwnProfile ? '/favorites' : undefined
                    )}

                    <a
                      href="#valoraciones"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('valoraciones')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 transition-transform hover:scale-[1.02]"
                    >
                      <div className="text-center">
                        <Star className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />
                        <p className="text-2xl font-black text-white">{profile.rating_count}</p>
                        <p className="text-sm text-gray-400">Valoraciones</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-2xl font-black text-white">Anuncios</h2>
            <SegmentedTabs
              tabs={listingTabs}
              value={listingFilter}
              onValueChange={value => setListingFilter(value as ListingFilter)}
              aria-label="Filtrar anuncios"
              className="md:max-w-lg"
            />
          </div>

          {filteredListings.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-md">
              <p className="text-gray-400 text-lg">
                {emptyStateCopy[listingFilter]}
              </p>
              {isOwnProfile && listingFilter === 'active' && (
                <p className="text-sm text-gray-500 mt-2">
                  Crea anuncios desde{' '}
                  <Link
                    href="/marketplace/create"
                    className="text-[#FFC000] underline"
                  >
                    el marketplace
                  </Link>{' '}
                  o gestiona los existentes en{' '}
                  <Link
                    href="/marketplace/my-listings"
                    className="text-[#FFC000] underline"
                  >
                    Mis Anuncios
                  </Link>
                  .
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>

        {/* Ratings Section */}
        <div id="valoraciones" className="space-y-6 mt-12 scroll-mt-8">
          <h2 className="text-2xl font-black text-white">Valoraciones</h2>

          {loadingRatings ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
            </div>
          ) : ratingSummary && ratingSummary.rating_count > 0 ? (
            <>
              {/* Summary Card */}
              <div className="rounded-lg border-2 border-black bg-[#374151] shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Overall Rating */}
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <span className="text-5xl font-black text-white">
                        {ratingSummary.rating_avg.toFixed(1)}
                      </span>
                      <Star className="h-8 w-8 fill-[#FFC000] text-[#FFC000]" />
                    </div>
                    <p className="text-gray-400">
                      Basado en {ratingSummary.rating_count}{' '}
                      {ratingSummary.rating_count === 1 ? 'valoración' : 'valoraciones'}
                    </p>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white min-w-[4rem]">
                        5 estrellas
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['5_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white min-w-[4rem]">
                        4 estrellas
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['4_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white min-w-[4rem]">
                        3 estrellas
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['3_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white min-w-[4rem]">
                        2 estrellas
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['2_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white min-w-[4rem]">
                        1 estrella
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['1_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ratings List */}
              <div className="space-y-4">
                {ratings.map(rating => {
                  const avatarUrl = resolveAvatarUrl(rating.rater_avatar_url, supabase);
                  return (
                    <div
                      key={rating.id}
                      className="rounded-lg border-2 border-black bg-[#374151] shadow-lg p-4"
                    >
                      <div className="flex gap-4">
                        {/* Rater Avatar */}
                        <Link
                          href={`/users/${rating.rater_id}`}
                          className="flex-shrink-0"
                        >
                          {avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt={rating.rater_nickname}
                              width={48}
                              height={48}
                              className="rounded-full border-2 border-black hover:opacity-80 transition-opacity"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#FFC000] border-2 border-black flex items-center justify-center hover:opacity-80 transition-opacity">
                              <User className="h-6 w-6 text-black" />
                            </div>
                          )}
                        </Link>

                        {/* Rating Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Link
                                href={`/users/${rating.rater_id}`}
                                className="font-bold text-white hover:text-[#FFC000] transition-colors"
                              >
                                {rating.rater_nickname}
                              </Link>
                              <div className="flex items-center gap-2 mt-1">
                                {renderStars(rating.rating)}
                                <Badge
                                  variant="outline"
                                  className="text-xs border-black"
                                >
                                  {rating.context_type === 'listing'
                                    ? 'Anuncio'
                                    : 'Intercambio'}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(rating.created_at).toLocaleDateString(
                                'es-ES',
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }
                              )}
                            </span>
                          </div>

                          {/* Comment */}
                          {rating.comment && (
                            <p className="text-gray-300 text-sm mt-2 bg-gray-800 p-3 rounded-md border-2 border-black">
                              {rating.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-md">
              <p className="text-gray-400 text-lg">
                Este usuario aún no ha recibido valoraciones
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
