'use client';

import { useState, useEffect } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import AuthGuard from '@/components/AuthGuard';
import { User, Trophy, Star, Calendar, Users } from 'lucide-react';

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

function ProfileContent() {
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userCollections, setUserCollections] = useState<UserCollection[]>([]);
  const [availableCollections, setAvailableCollections] = useState<
    Collection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState('');

  // Fetch user profile and collections
  const fetchProfileData = async () => {
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

      // Fetch user's collections with stats
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

      // Get stats for each user collection
      const collectionsWithStats = await Promise.all(
        (userCollectionsData || []).map(async (uc: any) => {
          if (!uc.collections) return null;

          // Get collection stats
          const { data: statsData } = await supabase.rpc(
            'get_user_collection_stats',
            {
              p_user_id: user.id,
              p_collection_id: uc.collections.id,
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
            ...uc.collections,
            is_user_active: uc.is_active,
            joined_at: uc.joined_at,
            stats,
          } as UserCollection;
        })
      );

      setUserCollections(collectionsWithStats.filter(Boolean));

      // Fetch available collections user hasn't joined
      const userCollectionIds = (userCollectionsData || [])
        .map((uc: any) => uc.collections?.id)
        .filter(Boolean);

      const { data: availableData, error: availableError } = await supabase
        .from('collections')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', `(${userCollectionIds.join(',') || '0'})`);

      if (availableError) throw availableError;
      setAvailableCollections(availableData || []);
    } catch (err: unknown) {
      console.error('Error fetching profile data:', err);
      setError(err instanceof Error ? err.message : 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

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

  // Switch active collection
  const switchActiveCollection = async (collectionId: number) => {
    if (!user) return;

    try {
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
      console.error('Error switching collection:', err);
      setError('Error switching collection');
    }
  };

  // Join a new collection
  const joinCollection = async (collectionId: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('user_collections').insert({
        user_id: user.id,
        collection_id: collectionId,
        is_active: false,
      });

      if (error) throw error;

      await fetchProfileData();
    } catch (err: unknown) {
      console.error('Error joining collection:', err);
      setError('Error joining collection');
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      fetchProfileData();
    }
  }, [user, userLoading]);

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

  const activeCollection = userCollections.find(uc => uc.is_user_active);

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
                    {userCollections.length} colección
                    {userCollections.length !== 1 ? 'es' : ''}
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
                        {activeCollection.stats.completion_percentage}%
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

        {/* My Collections */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-white">Mis Colecciones</h3>
            <Badge className="bg-white/20 text-white px-3 py-1">
              {userCollections.length} de{' '}
              {userCollections.length + availableCollections.length} disponibles
            </Badge>
          </div>

          {userCollections.length === 0 ? (
            <ModernCard className="bg-white">
              <ModernCardContent className="p-6 text-center">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-700 mb-2">
                  No tienes colecciones
                </h4>
                <p className="text-gray-500 text-sm mb-4">
                  Únete a una colección para empezar a intercambiar cromos
                </p>
              </ModernCardContent>
            </ModernCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userCollections.map(collection => (
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

                    {collection.stats && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
                        <div className="text-center">
                          <div className="font-bold text-green-600">
                            {collection.stats.completion_percentage}%
                          </div>
                          <div>Completo</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">
                            {collection.stats.owned_stickers}
                          </div>
                          <div>Cromos</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-purple-600">
                            {collection.stats.duplicates}
                          </div>
                          <div>Repetidos</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-orange-600">
                            {collection.stats.wanted}
                          </div>
                          <div>Busco</div>
                        </div>
                      </div>
                    )}

                    {!collection.is_user_active && (
                      <Button
                        size="sm"
                        onClick={() => switchActiveCollection(collection.id)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Hacer Activa
                      </Button>
                    )}

                    {collection.is_user_active && (
                      <div className="text-center">
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

        {/* Available Collections */}
        {availableCollections.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-white">
                Nuevas Colecciones
              </h3>
              <Badge className="bg-yellow-500 text-white px-3 py-1">
                {availableCollections.length} disponible
                {availableCollections.length !== 1 ? 's' : ''}
              </Badge>
            </div>
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

                    <p className="text-xs text-gray-600 mb-4">
                      {collection.competition} {collection.year}
                    </p>

                    {collection.description && (
                      <p className="text-xs text-gray-500 mb-4">
                        {collection.description}
                      </p>
                    )}

                    <Button
                      size="sm"
                      onClick={() => joinCollection(collection.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                    >
                      + Unirse a Colección
                    </Button>
                  </ModernCardContent>
                </ModernCard>
              ))}
            </div>
          </div>
        )}

        {/* No Available Collections */}
        {availableCollections.length === 0 && userCollections.length > 0 && (
          <div className="mt-8">
            <ModernCard className="bg-white/10 backdrop-blur-sm border border-white/20">
              <ModernCardContent className="p-6 text-center">
                <Star className="w-12 h-12 text-white/70 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-2">
                  ¡Todas las colecciones desbloqueadas!
                </h4>
                <p className="text-white/80 text-sm">
                  Ya formas parte de todas las colecciones disponibles
                </p>
              </ModernCardContent>
            </ModernCard>
          </div>
        )}
      </div>
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
