'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import AuthGuard from '@/components/AuthGuard';
import {
  User,
  Trophy,
  Star,
  Calendar,
  Users,
  Plus,
  Trash2,
  Target,
  Copy,
  Heart,
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
    wanted: number;
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
        console.error('Profile error:', profileError);
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

          const stats = statsData?.[0] || {
            total_stickers: 0,
            owned_stickers: 0,
            completion_percentage: 0,
            duplicates: 0,
            wanted: 0,
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
      console.error('Error fetching profile data:', err);
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
      console.error('Error updating nickname:', err);
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
      console.error('Error adding collection:', err);
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
      console.error('Error removing collection:', err);
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
      console.error('Error setting active collection:', err);
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
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Cargando perfil...</div>
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

  const activeCollection = ownedCollections.find(c => c.is_user_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            Mi Perfil
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profile Info Card */}
          <ModernCard className="bg-white">
            <ModernCardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  {editingNickname ? (
                    <div className="flex space-x-2">
                      <Input
                        value={nickname}
                        onChange={e => setNickname(e.target.value)}
                        placeholder="Tu nombre de usuario"
                        className="flex-1"
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
                      <Button size="sm" onClick={updateNickname}>
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNickname(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {profile?.nickname || 'Sin nombre'}
                      </h2>
                      <p className="text-gray-600 text-sm">{user?.email}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNickname(true)}
                        className="mt-2"
                      >
                        Editar nombre
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    Miembro desde{' '}
                    {new Date(profile?.created_at || '').toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm">
                    {ownedCollections.length} colección
                    {ownedCollections.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Active Collection Stats */}
          {activeCollection && (
            <ModernCard className="bg-white">
              <ModernCardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    Colección Activa
                  </h3>
                  <Badge className="bg-green-500 text-white">Activa</Badge>
                </div>

                <h4 className="font-semibold text-gray-700 mb-4">
                  {activeCollection.name}
                </h4>

                {activeCollection.stats && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(
                          activeCollection.stats.completion_percentage
                        )}
                        %
                      </div>
                      <div className="text-xs text-gray-500">Completado</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {activeCollection.stats.owned_stickers}
                      </div>
                      <div className="text-xs text-gray-500">Cromos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {activeCollection.stats.duplicates}
                      </div>
                      <div className="text-xs text-gray-500">Repetidos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {activeCollection.stats.wanted}
                      </div>
                      <div className="text-xs text-gray-500">Busco</div>
                    </div>
                  </div>
                )}
              </ModernCardContent>
            </ModernCard>
          )}
        </div>

        {/* MIS COLECCIONES SECTION */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-white">Mis Colecciones</h3>
            <Badge className="bg-white/20 text-white px-3 py-1">
              {ownedCollections.length} propias
            </Badge>
          </div>

          {ownedCollections.length === 0 ? (
            <ModernCard className="bg-white">
              <ModernCardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-gray-700 mb-2">
                  Aún no has añadido ninguna colección
                </h4>
                <p className="text-gray-500 text-sm mb-4">
                  Explora las colecciones disponibles y añade una para empezar a
                  intercambiar cromos
                </p>
              </ModernCardContent>
            </ModernCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ownedCollections.map(collection => (
                <ModernCard key={collection.id} className="bg-white">
                  <ModernCardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-gray-800 text-sm leading-tight">
                        {collection.name}
                      </h4>
                      {collection.is_user_active ? (
                        <Badge className="bg-green-500 text-white text-xs">
                          Activa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-gray-500 text-xs"
                        >
                          Inactiva
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 mb-3">
                      {collection.competition} {collection.year}
                    </p>

                    {/* Stats Grid */}
                    {collection.stats && (
                      <div className="mb-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 flex items-center">
                            <Target className="w-3 h-3 mr-1" />
                            Progreso
                          </span>
                          <span className="text-xs font-bold text-green-600">
                            {collection.stats.owned_stickers} /{' '}
                            {collection.stats.total_stickers}(
                            {Math.round(collection.stats.completion_percentage)}
                            %)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-500 flex items-center">
                            <Copy className="w-3 h-3 mr-1" />
                            Repetidos: {collection.stats.duplicates}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            Busco: {collection.stats.wanted}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {!collection.is_user_active && (
                        <Button
                          size="sm"
                          onClick={() => setActiveCollection(collection.id)}
                          disabled={actionLoading[`activate-${collection.id}`]}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          {actionLoading[`activate-${collection.id}`]
                            ? 'Activando...'
                            : 'Hacer Activa'}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            collectionId: collection.id,
                            collectionName: collection.name,
                          })
                        }
                        disabled={Object.values(actionLoading).some(Boolean)}
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar de mis colecciones
                      </Button>
                    </div>

                    {collection.is_user_active && (
                      <div className="text-center mt-2">
                        <span className="text-xs text-green-600 font-medium">
                          ✓ Esta es tu colección activa
                        </span>
                      </div>
                    )}
                  </ModernCardContent>
                </ModernCard>
              ))}
            </div>
          )}
        </div>

        {/* COLECCIONES DISPONIBLES SECTION */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-white">
              Colecciones Disponibles
            </h3>
            <Badge className="bg-yellow-500 text-white px-3 py-1">
              {availableCollections.length} disponible
              {availableCollections.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {availableCollections.length === 0 ? (
            <ModernCard className="bg-white/10 backdrop-blur-sm border border-white/20">
              <ModernCardContent className="p-8 text-center">
                <Star className="w-16 h-16 text-white/70 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-white mb-2">
                  ¡Ya has añadido todas las colecciones disponibles!
                </h4>
                <p className="text-white/80 text-sm">
                  No hay más colecciones para añadir en este momento
                </p>
              </ModernCardContent>
            </ModernCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableCollections.map(collection => (
                <ModernCard
                  key={collection.id}
                  className="bg-white border-2 border-dashed border-gray-200"
                >
                  <ModernCardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-800 text-sm leading-tight">
                        {collection.name}
                      </h4>
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                        Nueva
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-600 mb-2">
                      {collection.competition} {collection.year}
                    </p>

                    {collection.description && (
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                        {collection.description}
                      </p>
                    )}

                    <Button
                      size="sm"
                      onClick={() => addCollection(collection.id)}
                      disabled={actionLoading[`add-${collection.id}`]}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {actionLoading[`add-${collection.id}`]
                        ? 'Añadiendo...'
                        : 'Añadir a mis colecciones'}
                    </Button>
                  </ModernCardContent>
                </ModernCard>
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
              (tengo/quiero/duplicados). Esta acción no se puede deshacer.
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
