'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModernCard } from '@/components/ui/modern-card';
import AuthGuard from '@/components/AuthGuard';
import { useUser, useSupabase } from '@/components/providers/SupabaseProvider';
import { useProfileData } from '@/hooks/profile/useProfileData';
import { ProfileBadges } from '@/components/profile/ProfileBadges';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import {
  User,
  Calendar,
  Users,
  Edit3,
  CheckCircle,
  XCircle,
  EyeOff,
} from 'lucide-react';

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNickname && window.matchMedia('(min-width: 768px)').matches) {
      // Small timeout to ensure element is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editingNickname]);



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
      toast.success('Nombre actualizado');

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
      logger.error('Error updating nickname:', err);

      // Rollback optimistic update
      setOptimisticNickname(previousNickname);
      setEditingNickname(true);
      toast.error('Error al actualizar nombre');
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



  // Loading and error states
  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900 text-xl">Cargando perfil...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4 text-gray-900">
          <h1 className="text-2xl font-bold uppercase">Error</h1>
          <p>{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-[#FFC000] hover:bg-yellow-400 text-gray-900 border-2 border-black font-bold uppercase"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black uppercase text-gray-900 drop-shadow-lg mb-2">
            Mi Perfil
          </h1>
          <p className="text-gray-600">Gestiona tu información y colecciones</p>

          {/* Quick Actions */}
          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/profile/ignored')}
              className="border-2 border-black text-gray-900 bg-white hover:bg-[#FFC000] hover:text-gray-900"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Usuarios Ignorados
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="mb-12">
          <ModernCard className="bg-white border-2 border-black rounded-md shadow-xl overflow-hidden">
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
                          className="bg-gray-50 border-2 border-black text-gray-900 focus:border-[#FFC000] focus:ring-[#FFC000] flex-1"
                          onKeyDown={handleKeyDown}
                          ref={inputRef}
                          disabled={actionLoading['nick-user']}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={handleSaveNickname}
                          className="bg-[#FFC000] hover:bg-yellow-400 text-gray-900 border-2 border-black font-bold uppercase"
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
                          className="bg-[#E84D4D] hover:bg-red-600 text-white border-2 border-black font-bold uppercase"
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

        {/* BADGES SECTION */}
        <div className="mb-12">
          <ProfileBadges userId={user.id} isOwnProfile={true} />
        </div>


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
