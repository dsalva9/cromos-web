'use client';

import { useState, useCallback } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { OwnedCollectionsGrid } from '@/components/profile/OwnedCollectionsGrid';
import { AvailableCollectionsGrid } from '@/components/profile/AvailableCollectionsGrid';
import { ConfirmRemoveCollectionModal } from '@/components/profile/ConfirmRemoveCollectionModal';
import { ProfileLoadingSkeleton } from '@/components/profile/ProfileLoadingSkeleton';
import { useProfileData } from '@/hooks/profile/useProfileData';
import { useCollectionActions } from '@/hooks/profile/useCollectionActions';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

// Modal state interface
interface ConfirmModalState {
  open: boolean;
  collectionId: number | null;
  collectionName: string;
}

function ProfileContent() {
  const { user } = useUser();
  const {
    profile,
    nickname,
    setNickname,
    ownedCollections,
    availableCollections,
    loading,
    error,
    refresh,
    userLoading,
  } = useProfileData();

  const {
    addCollection,
    removeCollection,
    setActiveCollection,
    actionLoading,
    error: actionError,
  } = useCollectionActions({
    userId: user?.id || '',
    onAfterChange: refresh,
    ownedCollectionsCount: ownedCollections.length,
  });

  // UI state
  const [editingNickname, setEditingNickname] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    open: false,
    collectionId: null,
    collectionName: '',
  });

  // Profile actions
  const updateNickname = useCallback(async () => {
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

      setEditingNickname(false);
      refresh();
    } catch (err: unknown) {
      console.error('Error updating nickname:', err);
    }
  }, [user, nickname, refresh]);

  // Collection actions
  const handleRequestRemove = useCallback(
    (collectionId: number, collectionName: string) => {
      setConfirmModal({
        open: true,
        collectionId,
        collectionName,
      });
    },
    []
  );

  const handleConfirmRemove = useCallback(() => {
    if (confirmModal.collectionId) {
      removeCollection(confirmModal.collectionId);
      setConfirmModal({ open: false, collectionId: null, collectionName: '' });
    }
  }, [confirmModal.collectionId, removeCollection]);

  const handleCloseModal = useCallback(() => {
    setConfirmModal({ open: false, collectionId: null, collectionName: '' });
  }, []);

  // Loading and error states
  if (userLoading || loading) {
    return <ProfileLoadingSkeleton />;
  }

  if (error || actionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-center space-y-6 text-white">
          <h1 className="text-3xl font-bold">Error</h1>
          <p className="text-lg">{error || actionError}</p>
          <Button
            onClick={refresh}
            className="bg-white text-teal-600 hover:bg-gray-100 px-8 py-3 text-lg"
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
          <h1 className="text-4xl font-bold text-white/90 drop-shadow-lg mb-4">
            Mi Perfil
          </h1>
          <p className="text-white/80 text-lg">
            Gestiona tu información y colecciones
          </p>
        </div>

        {/* Profile Header Card */}
        <div className="mb-12">
          <ProfileHeaderCard
            profile={profile}
            userEmail={user?.email}
            nickname={nickname}
            editingNickname={editingNickname}
            ownedCollectionsCount={ownedCollections.length}
            onEditStart={() => setEditingNickname(true)}
            onSaveNickname={updateNickname}
            onCancelEdit={() => setEditingNickname(false)}
            onChangeNickname={setNickname}
          />
        </div>

        {/* Owned Collections Section */}
        <div className="mb-12">
          <OwnedCollectionsGrid
            collections={ownedCollections}
            onActivate={setActiveCollection}
            onRequestRemove={handleRequestRemove}
            actionLoading={actionLoading}
          />
        </div>

        {/* Available Collections Section */}
        <div>
          <AvailableCollectionsGrid
            collections={availableCollections}
            onAdd={addCollection}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmRemoveCollectionModal
        open={confirmModal.open}
        name={confirmModal.collectionName}
        onConfirm={handleConfirmRemove}
        onClose={handleCloseModal}
        loading={actionLoading[`remove-${confirmModal.collectionId}`]}
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
