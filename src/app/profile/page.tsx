'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import AuthGuard from '@/components/AuthGuard';
import { useUser, useSupabase } from '@/components/providers/SupabaseProvider';
import { useProfileData } from '@/hooks/profile/useProfileData';
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
  AlertTriangle,
} from 'lucide-react';

// Simple toast function
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('[data-toast]');
  existingToasts.forEach(toast => toast.remove());

  // Create toast
  const toast = document.createElement('div');
  toast.setAttribute('data-toast', 'true');
  toast.className = `fixed top-20 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white font-medium ${
    type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
};

function ProfileContent() {
  const { user, loading: userLoading } = useUser();
  const { supabase } = useSupabase();
  const router = useRouter();

  // Profile data
  const {
    profile,
    nickname,
    ownedCollections: originalOwnedCollections,
    availableCollections: originalAvailableCollections,
    loading,
    error,
  } = useProfileData();

  // Local state for optimistic updates
  const [optimisticOwnedCollections, setOptimisticOwnedCollections] = useState(
    originalOwnedCollections
  );
  const [optimisticAvailableCollections, setOptimisticAvailableCollections] =
    useState(originalAvailableCollections);
  const [optimisticNickname, setOptimisticNickname] = useState(nickname);

  // Use optimistic data when available, fallback to original
  const ownedCollections =
    optimisticOwnedCollections.length >= 0
      ? optimisticOwnedCollections
      : originalOwnedCollections;
  const availableCollections =
    optimisticAvailableCollections.length >= 0
      ? optimisticAvailableCollections
      : originalAvailableCollections;
  const displayNickname = optimisticNickname || nickname;

  // Check if there's an active collection
  const hasActiveCollection = ownedCollections.some(c => c.is_user_active);

  // Sync optimistic state when original data changes
  useEffect(() => {
    setOptimisticOwnedCollections(originalOwnedCollections);
    setOptimisticAvailableCollections(originalAvailableCollections);
    setOptimisticNickname(nickname);
  }, [originalOwnedCollections, originalAvailableCollections, nickname]);

  const [actionLoading, setActionLoading] = useState<{
    [key: string]: boolean;
  }>({});

  // Local UI state
  const [editingNickname, setEditingNickname] = useState(false);
  const [tempNickname, setTempNickname] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    collectionId: number | null;
    collectionName: string;
  }>({
    open: false,
    collectionId: null,
    collectionName: '',
  });

  // Handle nickname editing
  const handleEditNickname = () => {
    setTempNickname(displayNickname);
    setEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    if (!user) return;

    const actionKey = 'nick-user';
    const newNickname = tempNickname.trim();

    // Take snapshot for rollback
    const previousNickname = optimisticNickname;

    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));

      // Optimistic update
      setOptimisticNickname(newNickname);
      setEditingNickname(false);
      showToast('Nombre actualizado');

      // Server call
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          nickname: newNickname || null,
        },
        { onConflict: 'id' }
      );

      if (error) throw error;
    } catch (err) {
      console.error('Error updating nickname:', err);

      // Rollback optimistic update
      setOptimisticNickname(previousNickname);
      setEditingNickname(true);
      showToast('Error al actualizar nombre', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleCancelNickname = () => {
    setTempNickname('');
    setEditingNickname(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveNickname();
    } else if (e.key === 'Escape') {
      handleCancelNickname();
    }
  };

  // Handle collection navigation
  const handleViewCollection = (collectionId: number) => {
    router.push(`/mi-coleccion/${collectionId}`);
  };

  // Handle collection removal confirmation
  const handleRemoveClick = (collection: (typeof ownedCollections)[0]) => {
    setConfirmModal({
      open: true,
      collectionId: collection.id,
      collectionName: collection.name,
    });
  };

  const handleConfirmRemove = async () => {
    if (!confirmModal.collectionId || !user) return;

    const actionKey = `remove-${confirmModal.collectionId}`;
    const collectionToRemove = ownedCollections.find(
      c => c.id === confirmModal.collectionId
    );
    if (!collectionToRemove) return;

    // Check if removing active collection
    const removingActiveCollection = collectionToRemove.is_user_active;

    // Take snapshot for rollback
    const previousOwned = [...optimisticOwnedCollections];
    const previousAvailable = [...optimisticAvailableCollections];

    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));

      // Optimistic update
      setOptimisticOwnedCollections(prev =>
        prev.filter(c => c.id !== confirmModal.collectionId)
      );

      // Add back to available
      const backToAvailable = {
        id: collectionToRemove.id,
        name: collectionToRemove.name,
        competition: collectionToRemove.competition,
        year: collectionToRemove.year,
        description: collectionToRemove.description || null,
        is_active: true,
      };
      setOptimisticAvailableCollections(prev =>
        [...prev, backToAvailable].sort((a, b) => a.name.localeCompare(b.name))
      );

      setConfirmModal({ open: false, collectionId: null, collectionName: '' });

      // Show different message if removing active collection
      if (removingActiveCollection) {
        showToast(
          `"${collectionToRemove.name}" eliminada. No tienes colección activa.`
        );
      } else {
        showToast(`"${collectionToRemove.name}" eliminada de tu perfil`);
      }

      // Server calls
      const { data: stickerIds, error: stickerIdsError } = await supabase
        .from('stickers')
        .select('id')
        .eq('collection_id', confirmModal.collectionId);

      if (stickerIdsError) throw stickerIdsError;

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

      const { error: collectionError } = await supabase
        .from('user_collections')
        .delete()
        .eq('user_id', user.id)
        .eq('collection_id', confirmModal.collectionId);

      if (collectionError) throw collectionError;

      // Don't refresh - optimistic update is sufficient
    } catch (err) {
      console.error('Error removing collection:', err);

      // Rollback optimistic updates
      setOptimisticOwnedCollections(previousOwned);
      setOptimisticAvailableCollections(previousAvailable);
      showToast('Error al eliminar colección', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle setting active collection with optimistic updates
  const handleSetActiveCollection = async (collectionId: number) => {
    if (!user) return;

    const actionKey = `activate-${collectionId}`;
    const collection = ownedCollections.find(c => c.id === collectionId);
    if (!collection || collection.is_user_active) return;

    // Take snapshot for rollback
    const previousOwned = [...optimisticOwnedCollections];

    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));

      // Optimistic update - set all inactive, then set target as active
      setOptimisticOwnedCollections(prev =>
        prev.map(c => ({
          ...c,
          is_user_active: c.id === collectionId,
        }))
      );

      showToast(`"${collection.name}" es ahora tu colección activa`);

      // Server calls
      await supabase
        .from('user_collections')
        .update({ is_active: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('user_collections')
        .update({ is_active: true })
        .eq('user_id', user.id)
        .eq('collection_id', collectionId);

      if (error) throw error;
    } catch (err) {
      console.error('Error setting active collection:', err);

      // Rollback optimistic update
      setOptimisticOwnedCollections(previousOwned);
      showToast('Error al activar colección', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle adding collection with optimistic updates
  const handleAddCollection = async (collectionId: number) => {
    if (!user) return;

    const actionKey = `add-${collectionId}`;
    const collection = availableCollections.find(c => c.id === collectionId);
    if (!collection) return;

    // Take snapshot for rollback
    const previousOwned = [...optimisticOwnedCollections];
    const previousAvailable = [...optimisticAvailableCollections];
    const isFirstCollection = ownedCollections.length === 0;

    try {
      setActionLoading(prev => ({ ...prev, [actionKey]: true }));

      // Optimistic update - remove from available, add to owned
      setOptimisticAvailableCollections(prev =>
        prev.filter(c => c.id !== collectionId)
      );

      const newUserCollection = {
        ...collection,
        is_user_active: isFirstCollection,
        joined_at: new Date().toISOString(),
        stats: {
          total_stickers: 0,
          owned_stickers: 0,
          completion_percentage: 0,
          duplicates: 0,
          wanted: 0,
        },
      };

      if (isFirstCollection) {
        setOptimisticOwnedCollections([newUserCollection]);
      } else {
        setOptimisticOwnedCollections(prev => [...prev, newUserCollection]);
      }

      showToast(`"${collection.name}" añadida a tus colecciones`);

      // Server call
      const { error } = await supabase.from('user_collections').insert({
        user_id: user.id,
        collection_id: collectionId,
        is_active: isFirstCollection,
      });

      if (error) throw error;

      // Don't refresh - optimistic update is sufficient for UI
    } catch (err) {
      console.error('Error adding collection:', err);

      // Rollback optimistic updates
      setOptimisticOwnedCollections(previousOwned);
      setOptimisticAvailableCollections(previousAvailable);
      showToast('Error al añadir colección', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Loading and error states
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Cargando usuario...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (loading) {
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
            onClick={() => window.location.reload()}
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
                          value={tempNickname}
                          onChange={e => setTempNickname(e.target.value)}
                          placeholder="Tu nombre de usuario"
                          className="bg-white/90 border-0 text-gray-800 flex-1"
                          onKeyDown={handleKeyDown}
                          autoFocus
                          disabled={actionLoading['nick-user']}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={handleSaveNickname}
                          className="bg-green-500 hover:bg-green-600"
                          disabled={actionLoading['nick-user']}
                          type="button"
                        >
                          {actionLoading['nick-user'] ? (
                            'Guardando...'
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Guardar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelNickname}
                          className="bg-white/90 text-gray-800 border-0 hover:bg-white"
                          disabled={actionLoading['nick-user']}
                          type="button"
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
                          {displayNickname || 'Sin nombre'}
                        </h2>
                        <Button
                          size="sm"
                          onClick={handleEditNickname}
                          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white p-2"
                          type="button"
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
                            {ownedCollections?.length || 0} colección
                            {(ownedCollections?.length || 0) !== 1 ? 'es' : ''}
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

        {/* No Active Collection Warning */}
        {ownedCollections.length > 0 && !hasActiveCollection && (
          <div className="mb-8">
            <ModernCard className="bg-orange-50 border-2 border-orange-200 overflow-hidden">
              <ModernCardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-orange-800 font-semibold mb-1">
                      No tienes una colección activa
                    </h4>
                    <p className="text-orange-700 text-sm">
                      Selecciona una de tus colecciones como activa para poder
                      acceder a &quot;Mi Colección&quot; desde el menú
                      principal.
                    </p>
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        )}

        {/* MIS COLECCIONES SECTION */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-3xl font-bold text-white drop-shadow-lg">
              Mis Colecciones
            </h3>
            <Badge className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 text-lg">
              {ownedCollections?.length || 0} propias
            </Badge>
          </div>

          {!ownedCollections || ownedCollections.length === 0 ? (
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
                  className="bg-white hover:scale-105 hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer"
                  onClick={() => handleViewCollection(collection.id)}
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

                    {/* Action Buttons - Stop propagation to prevent card click */}
                    <div
                      className="space-y-3"
                      onClick={e => e.stopPropagation()}
                    >
                      {!collection.is_user_active && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleSetActiveCollection(collection.id)
                          }
                          disabled={actionLoading[`activate-${collection.id}`]}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                          type="button"
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
                        onClick={() => handleRemoveClick(collection)}
                        disabled={Object.values(actionLoading).some(Boolean)}
                        className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                        type="button"
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
              {availableCollections?.length || 0} disponible
              {(availableCollections?.length || 0) !== 1 ? 's' : ''}
            </Badge>
          </div>

          {!availableCollections || availableCollections.length === 0 ? (
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
                      onClick={() => handleAddCollection(collection.id)}
                      disabled={actionLoading[`add-${collection.id}`]}
                      className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                      type="button"
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
        onConfirm={handleConfirmRemove}
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
