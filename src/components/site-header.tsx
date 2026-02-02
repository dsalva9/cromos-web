'use client';

import { siteConfig } from '@/config/site';
import { useState, useEffect, MouseEvent } from 'react';
import Link from 'next/link';
import NavLink from '@/components/nav-link';
import {
  useSupabase,
  useUser,
} from '@/components/providers/SupabaseProvider';
import { cn } from '@/lib/utils';
import { UserAvatarDropdown } from '@/components/profile/UserAvatarDropdown';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { UserRatingDialog } from '@/components/marketplace/UserRatingDialog';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { Capacitor } from '@capacitor/core';

import { useCurrentUserProfile } from '@/hooks/social/useCurrentUserProfile';
import { resolveAvatarUrl, getAvatarFallback } from '@/lib/profile/resolveAvatarUrl';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

type NavigationLink = {
  href: string;
  label: string;
  requiresCompletion?: boolean;
};

// Simplified Avatar component for mobile that links directly to profile
function MobileUserAvatar({ userId }: { userId: string }) {
  const { profile } = useCurrentUserProfile();
  const { supabase } = useSupabase();

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url, supabase);
  const fallback = getAvatarFallback(profile?.nickname);

  return (
    <Link href={`/users/${userId}`} className="block shrink-0">
      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-black dark:border-white hover:border-[#FFC000] dark:hover:border-[#FFC000] transition-colors">
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
    </Link>
  );
}

// Simplified Notification component for mobile that links directly to notifications page
function MobileNotificationIcon() {
  const { unreadCount } = useNotifications();

  return (
    <Link href="/profile/notifications" className="p-2 text-gray-700 dark:text-gray-300 hover:text-[#FFC000] dark:hover:text-[#FFC000] transition-colors shrink-0">
      <div className="relative">
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { supabase } = useSupabase();
  const { user, loading } = useUser();
  // isAdmin now comes from ProfileCompletionProvider - eliminates separate query
  const { isComplete, isAdmin, loading: profileLoading } = useProfileCompletion();
  const router = useRouter();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingModalData, setRatingModalData] = useState<{
    userId: string;
    nickname: string;
    listingId: number;
    listingTitle: string;
  } | null>(null);

  const closeMenu = () => setIsMenuOpen(false);

  const baseLinks: NavigationLink[] = [
    { href: '/marketplace', label: 'Marketplace', requiresCompletion: true },
    { href: '/mis-plantillas', label: 'Mis Álbumes', requiresCompletion: true },
    { href: '/chats', label: 'Chats', requiresCompletion: true },
    { href: '/favorites', label: 'Favoritos', requiresCompletion: true },
  ];

  const unauthenticatedLinks: NavigationLink[] = [
    { href: '/login', label: 'Iniciar Sesión' },
    { href: '/signup', label: 'Registrarse' },
  ];

  const navigationLinks = user ? baseLinks : unauthenticatedLinks;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) closeMenu();
    };
    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleProtectedNavigation =
    (requiresCompletion?: boolean) =>
      (event: MouseEvent<HTMLAnchorElement>) => {
        if (
          requiresCompletion &&
          user &&
          (!isComplete || profileLoading)
        ) {
          event.preventDefault();
          closeMenu();
          toast.info(
            'Necesitas completar tu perfil para empezar a cambiar cromos!'
          );
          router.push('/profile/completar');
          return;
        }

        closeMenu();
      };

  const handleOpenRatingModal = (userId: string, nickname: string, listingId: number, listingTitle: string) => {
    setRatingModalData({ userId, nickname, listingId, listingTitle });
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (rating: number, comment?: string) => {
    if (!ratingModalData) return;

    const { error } = await supabase.rpc('create_user_rating', {
      p_rated_id: ratingModalData.userId,
      p_rating: rating,
      p_comment: comment || null,
      p_context_type: 'listing',
      p_context_id: ratingModalData.listingId
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (!user && !loading) {
      root.style.setProperty('--header-height', '7.5rem');
    } else {
      root.style.setProperty('--header-height', '4rem');
    }
  }, [user, loading]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm" style={{ paddingTop: 'var(--sat, 0px)' }}>
      {/* Beta Announcement Banner - Only visible for unauthenticated users */}
      {!user && !loading && (
        <div className="bg-black text-[#FFC000] py-2.5 px-4 overflow-hidden border-b border-[#FFC000]/20 shadow-inner">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-0.5 text-center">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#FFC000] text-black border-none px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-tighter shadow-sm shrink-0 animate-pulse">
                BETA ABIERTA
              </Badge>
              <span className="text-[12px] sm:text-sm font-black tracking-tight">🚀 ¡Estamos en Beta Abierta!</span>
            </div>
            <span className="text-[#FFC000]/40 hidden sm:inline">|</span>
            <p className="text-[11px] sm:text-xs font-bold tracking-tight text-white/90">
              Dinos qué mejorar en <a href="mailto:info@cambiocromos.com" className="text-[#FFC000] font-black hover:underline underline-offset-4 decoration-2">info@cambiocromos.com</a>
            </p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 text-2xl font-black uppercase text-gray-900 dark:text-white hover:text-[#FFC000] dark:hover:text-[#FFC000] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 rounded-md px-2 py-1"
            onClick={closeMenu}
          >
            <div className="relative w-10 h-10 sm:w-14 sm:h-14 shrink-0">
              <Image
                src="/assets/LogoBlanco.png"
                alt="Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="text-base sm:text-2xl truncate hidden min-[350px]:block">
              {siteConfig.name}
            </span>
          </Link>

          <nav
            role="navigation"
            aria-label="Main navigation"
            className="hidden md:flex md:items-center md:space-x-2"
          >
            <ul className="flex items-center space-x-2">
              {navigationLinks.map(link => (
                <li key={link.href} className="relative">
                  <NavLink
                    href={link.href}
                    className={cn(
                      'block px-4 py-2 rounded-md font-bold uppercase text-sm transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900',
                      'data-[current=page]:bg-[#FFC000] data-[current=page]:text-black data-[current=page]:dark:text-black',
                      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#FFC000] dark:hover:text-[#FFC000]'
                    )}
                    onClick={handleProtectedNavigation(link.requiresCompletion)}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            {!loading && user && (
              <div className="ml-4 flex items-center gap-2">
                <NotificationDropdown onOpenRatingModal={handleOpenRatingModal} />
                <UserAvatarDropdown isAdmin={isAdmin} />
              </div>
            )}
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            {!loading && (
              user ? (
                <>
                  <MobileNotificationIcon />
                  <MobileUserAvatar userId={user.id} />
                </>
              ) : (
                !Capacitor.isNativePlatform() && (
                  <Link
                    href="/login"
                    className="text-sm font-bold uppercase text-gray-900 dark:text-white px-3 py-1 border-2 border-black dark:border-white rounded-md hover:bg-[#FFC000] hover:text-black transition-colors"
                  >
                    Entrar
                  </Link>
                )
              )
            )}
          </div>
        </div>
      </div>



      {/* Rating Modal */}
      {ratingModalData && (
        <UserRatingDialog
          open={showRatingModal}
          onOpenChange={setShowRatingModal}
          userToRate={{
            id: ratingModalData.userId,
            nickname: ratingModalData.nickname
          }}
          listingTitle={ratingModalData.listingTitle}
          listingId={ratingModalData.listingId}
          onSubmit={handleSubmitRating}
        />
      )}
    </header>
  );
}
