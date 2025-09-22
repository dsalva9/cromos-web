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
                <ModernCard
                  key={collection.id}
                  className="bg-white hover:scale-105 hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  {/* Gradient Header Strip */}
                  <div
                    className={`h-3 ${
                      collection.is_user_active
                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                        : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}
                  />

                  <ModernCardContent className="p-5">
                    {/* Collection Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-lg leading-tight mb-1">
                          {collection.name}
                        </h4>
                        <p className="text-sm text-gray-600 font-medium">
                          {collection.competition} {collection.year}
                        </p>
                      </div>
                      {collection.is_user_active ? (
                        <Badge className="bg-green-500 text-white shadow-lg">
                          <Star className="w-3 h-3 mr-1" />
                          Activa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-gray-500 border-gray-300"
                        >
                          Inactiva
                        </Badge>
                      )}
                    </div>

                    {/* Stats Section */}
                    {collection.stats && (
                      <div className="mb-6 space-y-4">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Progreso
                            </span>
                            <span className="text-sm font-bold text-green-600">
                              {Math.round(
                                collection.stats.completion_percentage
                              )}
                              %
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${collection.stats.completion_percentage}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center bg-blue-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                              {collection.stats.owned_stickers}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center">
                              <Target className="w-3 h-3 mr-1" />
                              Cromos
                            </div>
                          </div>
                          <div className="text-center bg-purple-50 rounded-xl p-3">
                            <div className="text-2xl font-bold text-purple-600 mb-1">
                              {collection.stats.duplicates}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center justify-center">
                              <Copy className="w-3 h-3 mr-1" />
                              Repetidos
                            </div>
                          </div>
                        </div>

                        <div className="text-center bg-orange-50 rounded-xl p-3">
                          <div className="text-xl font-bold text-orange-600 mb-1">
                            {collection.stats.wanted}
                          </div>
                          <div className="text-xs text-gray-600 flex items-center justify-center">
                            <Heart className="w-3 h-3 mr-1" />
                            Me faltan
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {!collection.is_user_active && (
                        <Button
                          size="sm"
                          onClick={() => setActiveCollection(collection.id)}
                          disabled={actionLoading[`activate-${collection.id}`]}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {actionLoading[`activate-${collection.id}`] ? (
                            'Activando...'
                          ) : (
                            <>
                              <Star className="w-4 h-4 mr-2" />
                              Hacer Activa
                            </>
                          )}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() =>
                          setConfirmModal({
                            open: true,
                            collectionId: collection.id,
                            collectionName: collection.name,
                          })
                        }
                        disabled={Object.values(actionLoading).some(Boolean)}
                        className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>

                    {collection.is_user_active && (
                      <div className="text-center mt-4 p-3 bg-green-50 rounded-xl">
                        <span className="text-sm text-green-700 font-medium flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Esta es tu colección activa
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
                <ModernCard
                  key={collection.id}
                  className="bg-white hover:scale-105 hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-dashed border-yellow-200"
                >
                  {/* Gradient Header Strip */}
                  <div className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-500" />

                  <ModernCardContent className="p-5">
                    {/* Collection Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-lg leading-tight mb-1">
                          {collection.name}
                        </h4>
                        <p className="text-sm text-gray-600 font-medium">
                          {collection.competition} {collection.year}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 shadow-lg">
                        <Plus className="w-3 h-3 mr-1" />
                        Nueva
                      </Badge>
                    </div>

                    {collection.description && (
                      <p className="text-sm text-gray-500 mb-6 line-clamp-3">
                        {collection.description}
                      </p>
                    )}

                    {/* Add Button */}
                    <Button
                      size="sm"
                      onClick={() => addCollection(collection.id)}
                      disabled={actionLoading[`add-${collection.id}`]}
                      className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {actionLoading[`add-${collection.id}`] ? (
                        'Añadiendo...'
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Añadir a mis colecciones
                        </>
                      )}
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
