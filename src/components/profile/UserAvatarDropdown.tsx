'use client';

import { useState, MouseEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { User, Package, Heart, MessageCircle, LogOut, ChevronDown, EyeOff } from 'lucide-react';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useCurrentUserProfile } from '@/hooks/social/useCurrentUserProfile';
import { resolveAvatarUrl, getAvatarFallback } from '@/lib/profile/resolveAvatarUrl';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { toast } from '@/lib/toast';

interface UserAvatarDropdownProps {
  isAdmin?: boolean;
  /** Controlled open state (optional, for coordination with other dropdowns) */
  open?: boolean;
  /** Controlled open change handler (optional, for coordination with other dropdowns) */
  onOpenChange?: (open: boolean) => void;
}

export function UserAvatarDropdown({ isAdmin = false, open: controlledOpen, onOpenChange }: UserAvatarDropdownProps) {
  const { user } = useUser();
  const { profile, loading } = useCurrentUserProfile();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const { isComplete, loading: completionLoading } = useProfileCompletion();

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleSetIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      logger.error('Sign out error:', error);
    }
    handleSetIsOpen(false);
  };

  const handleProtectedClick =
    (href: string, requiresCompletion = false) =>
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (requiresCompletion && (!isComplete || completionLoading)) {
        event.preventDefault();
        toast.info(
          'Necesitas completar tu perfil para empezar a cambiar cromos!'
        );
        handleSetIsOpen(false);
        router.push('/profile/completar');
        return;
      }

      handleSetIsOpen(false);
    };

  if (!user || loading) {
    return null;
  }

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url, supabase);
  const fallback = getAvatarFallback(profile?.nickname);

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        type="button"
        onClick={() => handleSetIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-full border-2 border-black transition-all',
          'hover:border-[#FFC000] focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900',
          isOpen && 'border-[#FFC000]'
        )}
        aria-expanded={isOpen}
        aria-label="Menú de perfil"
      >
        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-black">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={profile?.nickname || 'Usuario'}
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <div
              className={cn(
                'w-full h-full flex items-center justify-center text-black font-black text-lg',
                fallback.gradientClass
              )}
            >
              {fallback.initial}
            </div>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-white transition-transform mr-1',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => handleSetIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 z-50 bg-gray-800 border-2 border-black rounded-md shadow-xl">
            <div className="p-3 border-b border-gray-700">
              <p className="font-bold text-white truncate">
                {profile?.nickname || 'Usuario'}
              </p>
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
            </div>

            <div className="py-2">
              <Link
                href={`/users/${user.id}`}
                onClick={handleProtectedClick(`/users/${user.id}`)}
                className="flex items-center gap-3 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Mi Perfil</span>
              </Link>

              <Link
                href="/marketplace/my-listings"
                onClick={handleProtectedClick('/marketplace/my-listings', true)}
                className="flex items-center gap-3 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
              >
                <Package className="h-4 w-4" />
                <span>Mis Anuncios</span>
              </Link>

              <Link
                href="/chats"
                onClick={handleProtectedClick('/chats', true)}
                className="flex items-center gap-3 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Chats</span>
              </Link>

              <Link
                href="/favorites"
                onClick={handleProtectedClick('/favorites')}
                className="flex items-center gap-3 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
              >
                <Heart className="h-4 w-4" />
                <span>Favoritos</span>
              </Link>

              <Link
                href="/profile/ignored"
                onClick={handleProtectedClick('/profile/ignored')}
                className="flex items-center gap-3 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
              >
                <EyeOff className="h-4 w-4" />
                <span>Usuarios Ignorados</span>
              </Link>

              {isAdmin && (
                <>
                  <div className="my-2 border-t border-gray-700" />
                  <Link
                    href="/admin/dashboard"
                    onClick={handleProtectedClick('/admin/dashboard')}
                    className="flex items-center gap-3 px-4 py-2 text-[#FFC000] hover:bg-gray-700 transition-colors font-bold"
                  >
                    <span>Admin Panel</span>
                  </Link>
                </>
              )}
            </div>

            <div className="border-t border-gray-700">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-white hover:bg-red-900/20 hover:text-red-400 transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
