'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { normalizeCollectionStats } from '@/lib/collectionStats';
import { Input } from '@/components/ui/input';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import AuthGuard from '@/components/AuthGuard';
import { logger } from '@/lib/logger';
import { OwnedCollectionCard } from '@/components/profile/OwnedCollectionCard';
import { AvailableCollectionCard } from '@/components/profile/AvailableCollectionCard';
import { CollectionGridSkeleton } from '@/components/profile/CollectionCardSkeleton';
import {
  User,
  Trophy,
  Star,
  Calendar,
  Users,
  Edit3,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
  description: string;
  is_active: boolean;
}

interface UserCollection extends Collection {
  is_user_active: boolean;
  joined_at: string;
  stats?: {
    total_stickers: number;
    owned_stickers: number;
    completion_percentage: number;
    duplicates: number;
    missing: number;
  };
}

interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserCollectionRawData {
  is_active: boolean;
  joined_at: string;
  collections: Collection[] | Collection | null;
}

function ProfileContent() {
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownedCollections, setOwnedCollections] = useState<UserCollection[]>(
    []
  );
  const [availableCollections, setAvailableCollections] = useState<
    Collection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState('');

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    collectionId: number | null;
    collectionName: string;
  }>({
    open: false,
    collectionId: null,
    collectionName: '',
  });

  // Action loading states
  const [actionLoading, setActionLoading] = useState<{
    [key: string]: boolean;
  }>({});

  // Fetch user profile and collections
  const fetchProfileData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        logger.error('Profile error:', profileError);
      }

      setProfile(
        profileData || {
          id: user.id,
          nickname: null,
          avatar_url: null,
          created_at: user.created_at,
        }
      );
      setNickname(profileData?.nickname || '');

      // Fetch user's owned collections with stats
      const { data: userCollectionsData, error: userCollectionsError } =
        await supabase
          .from('user_collections')
          .select(
            `
            is_active,
            joined_at,
            collections (
              id,
              name,
              competition,
              year,
              description,
              is_active
            )
          `
          )
          .eq('user_id', user.id);

      if (userCollectionsError) throw userCollectionsError;

      // Process owned collections and get stats
      const ownedWithStats = await Promise.all(
        (userCollectionsData || []).map(async (uc: UserCollectionRawData) => {
          if (!uc.collections) return null;

          const collection = Array.isArray(uc.collections)
            ? uc.collections[0]
            : uc.collections;

          if (!collection) return null;

          // Get collection stats
          const { data: statsData } = await supabase.rpc(
            'get_user_collection_stats',
            {
              p_user_id: user.id,
              p_collection_id: collection.id,
            }
          );

          const stats =
            normalizeCollectionStats(statsData) ?? {
              total_stickers: 0,
              owned_stickers: 0,
              completion_percentage: 0,
              duplicates: 0,
              missing: 0,
            };

          return {
            ...collection,
            is_user_active: uc.is_active,
            joined_at: uc.joined_at,
            stats,
          } as UserCollection;
        })
      );

      setOwnedCollections(ownedWithStats.filter(Boolean) as UserCollection[]);

      // Fetch available collections (not owned by user)
      const ownedIds = ownedWithStats.filter(Boolean).map(c => c!.id);

      let availableQuery = supabase
        .from('collections')
        .select('*')
        .eq('is_active', true);

      if (ownedIds.length > 0) {
        availableQuery = availableQuery.not(
          'id',
          'in',
          `(${ownedIds.join(',')})`
        );
      }

      const { data: availableData, error: availableError } =
        await availableQuery;

      if (availableError) throw availableError;
      setAvailableCollections(availableData || []);
    } catch (err: unknown) {
      logger.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err.message : 'Error loading profile');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Update profile nickname
  const updateNickname = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          nickname: nickname.trim() || null,
        },
        {
          onConflict: 'id',
        }
      );

      if (error) throw error;

      setProfile(prev =>
        prev ? { ...prev, nickname: nickname.trim() || null } : null
      );
      setEditingNickname(false);
    } catch (err: unknown) {
      logger.error('Error updating nickname:', err);
      setError('Error updating nickname');
    }
  };

  // Add collection to user's owned collections
  const addCollection = async (collectionId: number) => {
    if (!user) return;

    const actionKey = `add-${collectionId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));

      // Determine if this should be the active collection
      const isFirstCollection = ownedCollections.length === 0;

      const { error } = await supabase.from('user_collections').insert({
        user_id: user.id,
        collection_id: collectionId,
        is_active: isFirstCollection,
      });

      if (error) throw error;

      // Refresh data
      await fetchProfileData();
    } catch (err: unknown) {
      logger.error('Error adding collection:', err);
      setError('Error al añadir colección');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Remove collection and all user data for it
  const removeCollection = async (collectionId: number) => {
    if (!user) return;

    const actionKey = `remove-${collectionId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));

      // First, get all sticker IDs for this collection
      const { data: stickerIds, error: stickerIdsError } = await supabase
        .from('stickers')
        .select('id')
        .eq('collection_id', collectionId);

      if (stickerIdsError) throw stickerIdsError;

      // Remove user_stickers for this collection if any stickers exist
      if (stickerIds && stickerIds.length > 0) {
        const { error: stickersError } = await supabase
          .from('user_stickers')
          .delete()
          .eq('user_id', user.id)
          .in(
            'sticker_id',
            stickerIds.map(s => s.id)
          );

        if (stickersError) throw stickersError;
      }

      // Then remove the user_collection
      const { error: collectionError } = await supabase
        .from('user_collections')
        .delete()
        .eq('user_id', user.id)
        .eq('collection_id', collectionId);

      if (collectionError) throw collectionError;

      // Close modal and refresh data
      setConfirmModal({ open: false, collectionId: null, collectionName: '' });
      await fetchProfileData();
    } catch (err: unknown) {
      logger.error('Error removing collection:', err);
      setError('Error al eliminar colección');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Set active collection
  const setActiveCollection = async (collectionId: number) => {
    if (!user) return;

    const actionKey = `activate-${collectionId}`;
    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));

      // Set all collections inactive
      await supabase
        .from('user_collections')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Set selected collection as active
      const { error } = await supabase
        .from('user_collections')
        .update({ is_active: true })
        .eq('user_id', user.id)
        .eq('collection_id', collectionId);

      if (error) throw error;

      // Refresh data
      await fetchProfileData();
    } catch (err: unknown) {
      logger.error('Error setting active collection:', err);
      setError('Error al activar colección');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      fetchProfileData();
    }
  }, [user, userLoading, fetchProfileData]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
              Mi Perfil
            </h1>
            <p className="text-white/80">Gestiona tu información y colecciones</p>
          </div>

          {/* Profile Header Skeleton */}
          <div className="mb-12">
            <ModernCard className="bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-white/20 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-8 w-48 bg-white/20 rounded animate-pulse" />
                    <div className="h-5 w-64 bg-white/20 rounded animate-pulse" />
                    <div className="h-4 w-56 bg-white/20 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </ModernCard>
          </div>

          {/* Collections Sections */}
          <div className="space-y-12">
            {/* Owned Collections Skeleton */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-bold text-white drop-shadow-lg">
                  Mis Colecciones
                </h3>
                <Badge className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 text-lg">
                  --
                </Badge>
              </div>
              <CollectionGridSkeleton type="owned" count={3} />
            </div>

            {/* Available Collections Skeleton */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-3xl font-bold text-white drop-shadow-lg">
                  Colecciones Disponibles
                </h3>
                <Badge className="bg-yellow-500 text-white px-4 py-2 text-lg shadow-lg">
                  --
                </Badge>
              </div>
              <CollectionGridSkeleton type="available" count={2} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-center space-y-4 text-white">
          <h1 className="text-2xl font-bold">Error</h1>
          <p>{error}</p>
          <Button
            onClick={fetchProfileData}
            className="bg-white text-teal-600 hover:bg-gray-100"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
            Mi Perfil
          </h1>
          <p className="text-white/80">Gestiona tu información y colecciones</p>
        </div>

        {/* Profile Card */}
        <div className="mb-12">
          <ModernCard className="bg-white overflow-hidden hover:shadow-2xl transition-all duration-300">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
              <div className="flex items-center space-x-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl border-4 border-white/30">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 text-white">
                  {editingNickname ? (
                    <div className="space-y-3">
                      <div className="flex space-x-2">
                        <Input
                          value={nickname}
                          onChange={e => setNickname(e.target.value)}
                          placeholder="Tu nombre de usuario"
                          className="bg-white/90 border-0 text-gray-800 flex-1"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateNickname();
                            }
                            if (e.key === 'Escape') {
                              setEditingNickname(false);
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={updateNickname}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNickname(false)}
                          className="bg-white/90 text-gray-800 border-0 hover:bg-white"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-3xl font-bold">
                          {profile?.nickname || 'Sin nombre'}
                        </h2>
                        <Button
                          size="sm"
                          onClick={() => setEditingNickname(true)}
                          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white p-2"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-white/90 mb-3">{user?.email}</p>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Desde{' '}
                            {new Date(
                              profile?.created_at || ''
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>
                            {ownedCollections.length} colección
                            {ownedCollections.length !== 1 ? 'es' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ModernCard>
        </div>

        {/* MIS COLECCIONES SECTION */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-3xl font-bold text-white drop-shadow-lg">
              Mis Colecciones
            </h3>
            <Badge className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 text-lg">
              {ownedCollections.length} propias
            </Badge>
          </div>

          {ownedCollections.length === 0 ? (
            <ModernCard className="bg-white/10 backdrop-blur-sm border border-white/20">
              <ModernCardContent className="p-12 text-center">
                <Trophy className="w-20 h-20 text-white/50 mx-auto mb-6" />
                <h4 className="text-2xl font-semibold text-white mb-4">
                  Aún no has añadido ninguna colección
                </h4>
                <p className="text-white/80 text-lg mb-6">
                  Explora las colecciones disponibles y añade una para empezar a
                  intercambiar cromos
                </p>
              </ModernCardContent>
            </ModernCard>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ownedCollections.map(collection => (
                <OwnedCollectionCard
                  key={collection.id}
                  collection={collection}
                  onActivate={setActiveCollection}
                  onRequestRemove={(id, name) =>
                    setConfirmModal({
                      open: true,
                      collectionId: id,
                      collectionName: name,
                    })
                  }
                  isActivating={actionLoading[`activate-${collection.id}`]}
                  isRemoving={actionLoading[`remove-${collection.id}`]}
                />
              ))}
            </div>
          )}
        </div>

        {/* COLECCIONES DISPONIBLES SECTION */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-3xl font-bold text-white drop-shadow-lg">
              Colecciones Disponibles
            </h3>
            <Badge className="bg-yellow-500 text-white px-4 py-2 text-lg shadow-lg">
              {availableCollections.length} disponible
              {availableCollections.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {availableCollections.length === 0 ? (
            <ModernCard className="bg-white/10 backdrop-blur-sm border border-white/20">
              <ModernCardContent className="p-12 text-center">
                <Star className="w-20 h-20 text-white/50 mx-auto mb-6" />
                <h4 className="text-2xl font-semibold text-white mb-4">
                  ¡Ya has añadido todas las colecciones disponibles!
                </h4>
                <p className="text-white/80 text-lg">
                  No hay más colecciones para añadir en este momento
                </p>
              </ModernCardContent>
            </ModernCard>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableCollections.map(collection => (
                <AvailableCollectionCard
                  key={collection.id}
                  collection={collection}
                  onAdd={addCollection}
                  isAdding={actionLoading[`add-${collection.id}`]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmModal.open}
        onOpenChange={open =>
          setConfirmModal({ open, collectionId: null, collectionName: '' })
        }
        title="Eliminar colección de tu perfil"
        description={
          <div className="space-y-2">
            <p>
              ¿Estás seguro de que quieres eliminar &ldquo;
              {confirmModal.collectionName}&rdquo; de tu perfil?
            </p>
            <p className="text-sm text-red-600">
              <strong>
                Se eliminarán también todos tus datos de esta colección
              </strong>
              (tengo/duplicados/faltan). Esta acción no se puede deshacer.
            </p>
          </div>
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (confirmModal.collectionId) {
            removeCollection(confirmModal.collectionId);
          }
        }}
        loading={actionLoading[`remove-${confirmModal.collectionId}`]}
        variant="destructive"
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
