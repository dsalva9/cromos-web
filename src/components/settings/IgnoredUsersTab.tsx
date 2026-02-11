'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { User, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIgnoredUsers } from '@/hooks/social/useIgnore';
import { useUser } from '@/components/providers/SupabaseProvider';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { logger } from '@/lib/logger';

export function IgnoredUsersTab() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const {
    ignoredUsers,
    loading,
    error,
    fetchIgnoredUsers,
    removeFromIgnoredList,
  } = useIgnoredUsers();
  const [unignoring, setUnignoring] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      void fetchIgnoredUsers();
    }
  }, [user, fetchIgnoredUsers]);

  const handleUnignoreUser = async (userId: string, nickname: string) => {
    setUnignoring(userId);
    try {
      const { error } = await supabase.rpc('unignore_user', {
        p_ignored_user_id: userId,
      });

      if (error) throw error;

      toast.success(`${nickname} ha sido eliminado de tu lista de bloqueados`);
      removeFromIgnoredList(userId);
    } catch (error) {
      logger.error('Error unignoring user:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al desbloquear usuario'
      );
    } finally {
      setUnignoring(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'hoy';
    if (diffDays === 1) return 'ayer';
    if (diffDays < 7)
      return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    }
    const months = Math.floor(diffDays / 30);
    return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-[#FFC000]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <Button
          onClick={() => void fetchIgnoredUsers()}
          className="bg-[#FFC000] hover:bg-[#FFD633] text-gray-900"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (ignoredUsers.length === 0) {
    return (
      <ModernCard className="bg-white dark:bg-gray-800/10 backdrop-blur-sm border border-gray-200 dark:border-gray-700/20">
        <ModernCardContent className="p-16 text-center">
          <Eye className="w-20 h-20 text-gray-400 dark:text-white/50 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            No tienes usuarios bloqueados
          </h2>
          <p className="text-gray-600 dark:text-white/80 text-lg">
            Cuando bloquees a usuarios, aparecerán aquí para que puedas
            gestionarlos.
          </p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <div className="space-y-4">
      {ignoredUsers.map(ignoredUser => {
        const avatarUrl = resolveAvatarUrl(
          ignoredUser.avatar_url,
          supabase
        );
        return (
          <ModernCard
            key={ignoredUser.ignored_user_id}
            className="bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-700 hover:shadow-xl transition-all duration-300"
          >
            <ModernCardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* User Info */}
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <Link
                    href={`/users/${ignoredUser.ignored_user_id}`}
                    className="flex-shrink-0"
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={ignoredUser.nickname}
                        width={60}
                        height={60}
                        className="rounded-full border-2 border-black dark:border-gray-700 object-cover hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-15 h-15 rounded-full bg-[#FFC000] border-2 border-black dark:border-gray-700 flex items-center justify-center hover:opacity-80 transition-opacity">
                        <User className="h-8 w-8 text-black" />
                      </div>
                    )}
                  </Link>

                  {/* Details */}
                  <div>
                    <Link
                      href={`/users/${ignoredUser.ignored_user_id}`}
                      className="block"
                    >
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white hover:text-[#FFC000] transition-colors">
                        {ignoredUser.nickname}
                      </h3>
                    </Link>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Bloqueado {formatDate(ignoredUser.created_at)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void handleUnignoreUser(
                        ignoredUser.ignored_user_id,
                        ignoredUser.nickname
                      )
                    }
                    disabled={
                      unignoring === ignoredUser.ignored_user_id
                    }
                    className="border-2 border-black dark:border-gray-700 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 hover:bg-[#FFC000] hover:text-gray-900 dark:hover:text-gray-900"
                  >
                    {unignoring === ignoredUser.ignored_user_id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      'Desbloquear'
                    )}
                  </Button>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        );
      })}
    </div>
  );
}
