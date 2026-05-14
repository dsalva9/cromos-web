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
import { UserLink } from '@/components/ui/user-link';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FavoriteButton } from '@/components/social/FavoriteButton';
import { ReportButton } from '@/components/social/ReportButton';
import { IgnoreButton } from '@/components/social/IgnoreButton';
import { ProfileBadgesSimple } from '@/components/badges/ProfileBadgesSimple';
import {
  useUser,
  useSupabaseClient,
} from '@/components/providers/SupabaseProvider';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { User, Star, Heart, Package, MapPin, Pencil, Ban, Trash2 } from 'lucide-react';
import {
  AvatarPicker,
  AvatarSelection,
} from '@/components/profile/AvatarPicker';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import { validatePostcode, getPostcodeRule } from '@/lib/validations/postcode';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useTranslations } from 'next-intl';
import { getSupportMailtoUrl } from '@/lib/utils';

// @ts-ignore
const STATUS_LABELS = {
  active: 'Activos',
  reserved: 'Reservados',
  sold: 'Completados',
  removed: 'Eliminados',
} as const;

type ListingFilter = keyof typeof STATUS_LABELS;

const emptyStateCopy: Record<ListingFilter, string> = {
  active: 'No hay anuncios activos',
  reserved: 'No hay anuncios reservados',
  sold: 'No hay anuncios completados',
  removed: 'No hay anuncios eliminados',
};
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
  const t = useTranslations('userProfile');
  const params = useParams();
  const { user: currentUser } = useUser();
  const supabase = useSupabaseClient();
  const { updateProfile: updateCompletionProfile, refresh: refreshCompletion } =
    useProfileCompletion();
  const userId = params.userId as string;

  const { profile, listings, loading, error, refetch, adjustFavoritesCount } =
    useUserProfile(userId);
  const { enabled: multiCountryEnabled } = useFeatureFlag('multi_country');

  const [listingFilter, setListingFilter] = useState<ListingFilter>('active');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formNickname, setFormNickname] = useState('');
  const [formPostcode, setFormPostcode] = useState('');
  const [formCountry, setFormCountry] = useState('ES');
  const [formAvatarPath, setFormAvatarPath] = useState<string | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<{
    blob: Blob;
    fileName: string;
  } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Ratings state
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(
    null
  );
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFormNickname(
      profile.nickname && profile.nickname !== 'Sin nombre'
        ? profile.nickname
        : ''
    );
    setFormPostcode(profile.postcode ?? '');
    setFormCountry(profile.country_code ?? 'ES');
    setFormAvatarPath(profile.avatar_url ?? null);
    setAvatarBlob(null);
  }, [profile, editDialogOpen]);

  const postcodeRule = useMemo(
    () => getPostcodeRule(formCountry),
    [formCountry]
  );

  // Check if current user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (!currentUser) {
        setIsCurrentUserAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .single();

        if (!error && data) {
          setIsCurrentUserAdmin(data.is_admin ?? false);
        }
      } catch (err) {
        logger.error('Error checking admin status:', err);
        setIsCurrentUserAdmin(false);
      }
    }

    void checkAdmin();
  }, [currentUser, supabase]);

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
          setRatingSummary(summaryData[0] as unknown as typeof ratingSummary);
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
    [profile?.avatar_url, supabase]
  );

  const previewAvatarUrl = useMemo(
    () => resolveAvatarUrl(formAvatarPath, supabase),
    [formAvatarPath, supabase]
  );

  const userCountryInfo = useMemo(
    () => SUPPORTED_COUNTRIES.find(c => c.code === profile?.country_code),
    [profile?.country_code]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<ListingFilter, number> = {
      active: 0,
      reserved: 0,
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
    () => (isOwnProfile ? ['active', 'reserved', 'sold', 'removed'] : ['active']),
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 dark:text-white text-xl mb-4">{t('notFoundTitle')}</p>
          <p className="text-gray-500 dark:text-gray-400 mt-4">
            {t('notFoundContact')}{' '}
            <a
              href={getSupportMailtoUrl()}
              className="text-gold hover:text-yellow-600 underline font-bold"
            >
              soporte@cambiocromos.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  const emailDisplay = isOwnProfile ? (currentUser?.email ?? null) : null;

  const locationDisplay = profile.location_label ?? null;

  const listingTabs = availableStatuses.map(status => ({
    value: status,
    label: t(`status.${status}`),
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
      toast.error(t('toast.nicknameRequired'));
      return;
    }

    if (trimmedNickname.toLowerCase() === 'sin nombre') {
      toast.error(t('toast.nicknameInvalid'));
      return;
    }

    if (!trimmedPostcode) {
      toast.error(t('toast.postcodeRequired', { field: postcodeRule.label.toLowerCase() }));
      return;
    }

    if (!validatePostcode(trimmedPostcode, formCountry)) {
      toast.error(t('toast.postcodeInvalid', { field: postcodeRule.label.toLowerCase(), placeholder: postcodeRule.placeholder }));
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
        toast.error(t('toast.nicknameTaken'));
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
          country_code: formCountry,
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

      toast.success(t('toast.profileUpdated'));
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
      if (
        updateErr &&
        typeof updateErr === 'object' &&
        'message' in updateErr
      ) {
        const errorMessage = String(updateErr.message);

        // Check if it's a postcode validation error from the database
        if (
          errorMessage.includes('codigo postal') ||
          errorMessage.includes('postcode')
        ) {
          toast.error(t('toast.postcodeApiError'));
          return;
        }
      }

      toast.error(t('toast.updateError'));
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
      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
        {icon}
        <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    );

    if (!href) return card;

    return (
      <Link
        href={href}
        className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-transform hover:scale-[1.02]"
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
            className={`h-5 w-5 ${star <= rating ? 'fill-gold text-gold' : 'text-gray-200'
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
        <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
          <div
            className="h-full bg-gold transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-bold min-w-[3rem] text-right">
          {count}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all duration-300">
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
                      className="rounded-full border border-gray-200 dark:border-gray-700 object-cover shadow-sm bg-gray-50 dark:bg-gray-800"
                    />
                  ) : (
                    <div className="w-30 h-30 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                    <div>
                      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                        {profile.nickname}
                      </h1>

                      {/* Email & Location */}
                      {emailDisplay && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium">
                          {emailDisplay}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>
                          {userCountryInfo && <span className="mr-1">{userCountryInfo.flag}</span>}
                          {locationDisplay ??
                            (isOwnProfile
                              ? t('addPostcodePrompt')
                              : t('locationUnavailable'))}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mt-3">
                        <a
                          href="#valoraciones"
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          onClick={e => {
                            e.preventDefault();
                            document
                              .getElementById('valoraciones')
                              ?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-700">
                            <Star className="h-5 w-5 fill-gold text-gold" />
                            <span className="text-gray-900 dark:text-white font-bold text-lg">
                              {profile.rating_avg.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium">
                            ({profile.rating_count}{' '}
                            {profile.rating_count === 1
                              ? t('ratingsCountOne')
                              : t('ratingsCountOther')}
                            )
                          </span>
                        </a>
                      </div>

                      {/* Badges - Admin and suspension badges only visible to admins */}
                      <div className="flex gap-2 mt-3">
                        {profile.is_admin && isCurrentUserAdmin && (
                          <Badge className="bg-red-50 text-red-600 border-red-100">
                            {t('badges.admin')}
                          </Badge>
                        )}
                        {profile.is_suspended && !profile.deleted_at && isCurrentUserAdmin && (
                          <Badge className="bg-red-50 text-red-600 border-red-100 flex items-center gap-1">
                            <Ban className="h-3 w-3" />
                            {t('badges.suspended')}
                          </Badge>
                        )}
                        {profile.deleted_at && isCurrentUserAdmin && (
                          <Badge className="bg-orange-50 text-orange-600 border-orange-100 flex items-center gap-1">
                            <Trash2 className="h-3 w-3" />
                            {t('badges.deleted')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isOwnProfile && currentUser && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <FavoriteButton
                            userId={userId}
                            onFavoriteDelta={adjustFavoritesCount}
                          />
                          <IgnoreButton
                            userId={userId}
                            variant="outline"
                            size="sm"
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
                              className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              {t('editModal.btn')}
                            </Button>
                          </DialogTrigger>

                          <DialogContent className="max-w-2xl p-0 max-h-[calc(100dvh-6rem)]">
                            <div className="p-6 pb-4 flex-shrink-0">
                              <DialogHeader>
                                <DialogTitle>{t('editModal.title')}</DialogTitle>
                                <DialogDescription>
                                  {t('editModal.desc')}
                                </DialogDescription>
                              </DialogHeader>
                            </div>

                            <div className="px-6 pb-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                              <div className="space-y-3">
                                <Label>{t('editModal.avatarLabel')}</Label>
                                <AvatarPicker
                                  currentAvatarUrl={previewAvatarUrl}
                                  onSelect={handleAvatarSelection}
                                  uploading={uploadingAvatar}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="nickname">{t('editModal.nicknameLabel')}</Label>
                                <Input
                                  id="nickname"
                                  value={formNickname}
                                  onChange={event =>
                                    setFormNickname(event.target.value)
                                  }
                                  maxLength={50}
                                  placeholder={t('editModal.nicknamePlaceholder')}
                                  required
                                />
                              </div>

                              {multiCountryEnabled && (
                                <div className="space-y-2">
                                  <Label htmlFor="country">{t('editModal.countryLabel')}</Label>
                                  <Select value={formCountry} onValueChange={(val) => { setFormCountry(val); setFormPostcode(''); }}>
                                    <SelectTrigger id="country">
                                      <SelectValue placeholder={t('editModal.countryPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SUPPORTED_COUNTRIES.map(country => (
                                        <SelectItem key={country.code} value={country.code}>
                                          {country.flag} {country.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label htmlFor="postcode">{postcodeRule.label}</Label>
                                <Input
                                  id="postcode"
                                  value={formPostcode}
                                  onChange={event =>
                                    setFormPostcode(event.target.value)
                                  }
                                  maxLength={postcodeRule.maxLength}
                                  placeholder={postcodeRule.placeholder}
                                  required
                                  inputMode={formCountry === 'AR' || formCountry === 'BR' ? 'text' : 'numeric'}
                                />
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {t('editModal.postcodeHint')}
                                </p>
                              </div>
                            </div>

                            <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                              <DialogFooter className="sm:justify-between">
                                <Button
                                  variant="outline"
                                  className="border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                  onClick={() => setEditDialogOpen(false)}
                                  type="button"
                                  disabled={savingProfile}
                                >
                                  {t('editModal.cancel')}
                                </Button>
                                <Button
                                  className="bg-gold text-black hover:bg-gold-light font-bold"
                                  onClick={handleSaveProfile}
                                  type="button"
                                  disabled={savingProfile || uploadingAvatar}
                                >
                                  {savingProfile
                                    ? t('editModal.saving')
                                    : t('editModal.save')}
                                </Button>
                              </DialogFooter>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                    {renderStatCard(
                      <Package className="h-6 w-6 mx-auto mb-2 text-gold" />,
                      statusCounts.active,
                      t('stats.activeListings'),
                      isOwnProfile ? '/marketplace/my-listings' : undefined
                    )}

                    {renderStatCard(
                      <Heart className="h-6 w-6 mx-auto mb-2 text-gold" />,
                      profile.favorites_count,
                      t('stats.favorites'),
                      isOwnProfile ? '/favorites' : undefined
                    )}

                    <a
                      href="#valoraciones"
                      onClick={e => {
                        e.preventDefault();
                        document
                          .getElementById('valoraciones')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-transform hover:scale-[1.02]"
                    >
                      <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                        <Star className="h-6 w-6 mx-auto mb-2 text-gold" />
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                          {profile.rating_count}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('ratings.title')}</p>
                      </div>
                    </a>
                  </div>

                  {/* BADGES SUBSECTION */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <ProfileBadgesSimple userId={userId} isOwnProfile={isOwnProfile} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Ratings Section */}
        <div id="valoraciones" className="space-y-6 mt-12 scroll-mt-8">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Valoraciones</h2>

          {loadingRatings ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
            </div>
          ) : ratingSummary && ratingSummary.rating_count > 0 ? (
            <>
              {/* Summary Card */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Overall Rating */}
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                      <span className="text-5xl font-black text-gray-900 dark:text-white">
                        {ratingSummary.rating_avg.toFixed(1)}
                      </span>
                      <Star className="h-8 w-8 fill-gold text-gold" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                      {ratingSummary.rating_count === 1 ? t('ratings.basedOnOne', { count: ratingSummary.rating_count }) : t('ratings.basedOnOther', { count: ratingSummary.rating_count })}
                    </p>
                  </div>

                  {/* Rating Distribution */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[4rem]">
                        {t('ratings.stars5')}
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['5_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[4rem]">
                        {t('ratings.stars4')}
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['4_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[4rem]">
                        {t('ratings.stars3')}
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['3_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[4rem]">
                        {t('ratings.stars2')}
                      </span>
                      {renderRatingBar(
                        ratingSummary.rating_distribution['2_star'],
                        ratingSummary.rating_count
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[4rem]">
                        {t('ratings.stars1')}
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
                  const avatarUrl = resolveAvatarUrl(
                    rating.rater_avatar_url,
                    supabase
                  );
                  return (
                    <div
                      key={rating.id}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 transition-all hover:shadow-md"
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
                              className="rounded-full border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity bg-gray-50 dark:bg-gray-800"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:opacity-80 transition-opacity text-gray-400">
                              <User className="h-6 w-6" />
                            </div>
                          )}
                        </Link>

                        {/* Rating Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <UserLink
                                userId={rating.rater_id}
                                nickname={rating.rater_nickname}
                                variant="bold"
                              />
                              <div className="flex items-center gap-2 mt-1">
                                {renderStars(rating.rating)}
                                <Badge
                                  variant="outline"
                                  className="text-xs border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800"
                                >
                                  {rating.context_type === 'listing'
                                    ? t('ratings.typeListing')
                                    : t('ratings.typeTrade')}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
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
                            <p className="text-gray-700 dark:text-gray-300 text-sm mt-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
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
            <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-white/50 dark:bg-gray-800/50">
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {t('ratings.empty')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
