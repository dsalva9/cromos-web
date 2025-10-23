'use client';

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  ChangeEvent,
} from 'react';
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
import {
  useUser,
  useSupabaseClient,
} from '@/components/providers/SupabaseProvider';
import { toast } from '@/lib/toast';
import {
  User,
  Star,
  Heart,
  Package,
  MapPin,
  Pencil,
  Upload,
} from 'lucide-react';

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

export default function UserProfilePage() {
  const params = useParams();
  const { user: currentUser } = useUser();
  const supabase = useSupabaseClient();
  const userId = params.userId as string;

  const {
    profile,
    listings,
    loading,
    error,
    refetch,
    adjustFavoritesCount,
  } = useUserProfile(userId);

  const [listingFilter, setListingFilter] =
    useState<ListingFilter>('active');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formNickname, setFormNickname] = useState('');
  const [formPostcode, setFormPostcode] = useState('');
  const [formAvatarPath, setFormAvatarPath] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFormNickname(
      profile.nickname && profile.nickname !== 'Sin nombre'
        ? profile.nickname
        : ''
    );
    setFormPostcode(profile.postcode ?? '');
    setFormAvatarPath(profile.avatar_url ?? null);
  }, [profile, editDialogOpen]);

  const resolveAvatarUrl = (value: string | null) => {
    if (!value) return null;
    if (value.startsWith('http')) return value;
    const { data } = supabase.storage.from('avatars').getPublicUrl(value);
    return data.publicUrl;
  };

  const displayAvatarUrl = useMemo(
    () => resolveAvatarUrl(profile?.avatar_url ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.avatar_url]
  );

  const previewAvatarUrl = useMemo(
    () => resolveAvatarUrl(formAvatarPath),
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

  const emailDisplay = isOwnProfile ? currentUser?.email ?? null : null;

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

  const handleAvatarUpload = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    if (!currentUser) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Selecciona una imagen de menos de 2MB');
      event.target.value = '';
      return;
    }

    const fileExt = file.name.split('.').pop() ?? 'png';
    const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

    try {
      setUploadingAvatar(true);
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      setFormAvatarPath(fileName);
      toast.success('Avatar cargado correctamente');
    } catch (uploadErr) {
      console.error('Error uploading avatar', uploadErr);
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    const trimmedNickname = formNickname.trim();
    const trimmedPostcode = formPostcode.trim();
    const normalizedPostcode =
      trimmedPostcode.length === 0 ? null : trimmedPostcode;

    if (normalizedPostcode && !postcodeRegex.test(normalizedPostcode)) {
      toast.error('Introduce un código postal válido');
      return;
    }

    try {
      setSavingProfile(true);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname: trimmedNickname || null,
          postcode: normalizedPostcode,
          avatar_url: formAvatarPath,
        })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      toast.success('Perfil actualizado');
      setEditDialogOpen(false);
      await refetch();
    } catch (updateErr) {
      console.error('Profile update failed', updateErr);
      toast.error('No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const renderStatCard = (
    icon: JSX.Element,
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
                              ? 'Añade tu código postal para mostrar tu ubicación aproximada'
                              : 'Ubicación no disponible')}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-5 w-5 fill-[#FFC000] text-[#FFC000]" />
                          <span className="text-white font-bold text-lg">
                            {profile.rating_avg.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-gray-400">
                          ({profile.rating_count}{' '}
                          {profile.rating_count === 1
                            ? 'valoración'
                            : 'valoraciones'}
                          )
                        </span>
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
                        <FavoriteButton
                          userId={userId}
                          onFavoriteDelta={adjustFavoritesCount}
                        />
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

                          <DialogContent className="space-y-4">
                            <DialogHeader>
                              <DialogTitle>Editar perfil</DialogTitle>
                              <DialogDescription>
                                Actualiza tu avatar, nombre y ubicaciA3n aproximada.
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {previewAvatarUrl ? (
                                    <Image
                                      src={previewAvatarUrl}
                                      alt="Avatar"
                                      width={96}
                                      height={96}
                                      className="rounded-full border-4 border-black object-cover"
                                    />
                                  ) : (
                                    <div className="w-24 h-24 rounded-full bg-[#FFC000] border-4 border-black flex items-center justify-center">
                                      <User className="h-10 w-10 text-black" />
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="avatar-upload">Avatar</Label>
                                  <p className="text-xs text-gray-400 max-w-xs">
                                    Usa una imagen cuadrada (PNG o JPG) de hasta 2MB.
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="border-2 border-black text-white bg-[#1F2937] hover:bg-[#FFC000] hover:text-gray-900"
                                      disabled={uploadingAvatar}
                                      onClick={() => fileInputRef.current?.click()}
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      {uploadingAvatar ? 'Subiendo...' : 'Seleccionar imagen'}
                                    </Button>
                                    <input
                                      ref={fileInputRef}
                                      id="avatar-upload"
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={handleAvatarUpload}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="nickname">Nombre</Label>
                                <Input
                                  id="nickname"
                                  value={formNickname}
                                  onChange={event => setFormNickname(event.target.value)}
                                  maxLength={50}
                                  placeholder="Tu nombre de usuario"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="postcode">CA3digo postal</Label>
                                <Input
                                  id="postcode"
                                  value={formPostcode}
                                  onChange={event => setFormPostcode(event.target.value)}
                                  maxLength={5}
                                  placeholder="28001"
                                  inputMode="numeric"
                                />
                                <p className="text-xs text-gray-400">
                                  Mostramos tu ubicaciA3n aproximada en base al cA3digo postal.
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
                                {savingProfile ? 'Guardando...' : 'Guardar cambios'}
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

                    {renderStatCard(
                      <Star className="h-6 w-6 mx-auto mb-2 text-[#FFC000]" />,
                      profile.rating_count,
                      'Valoraciones'
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>


        {/* Listings */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="text-2xl font-black text-white">
              Anuncios
            </h2>
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
      </div>
    </div>
  );
}
