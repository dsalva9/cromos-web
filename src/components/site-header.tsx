'use client';

import { siteConfig } from '@/config/site';
import { useState, useEffect, MouseEvent } from 'react';
import Link from 'next/link';
import { Menu, X, Bell, User, Package, Heart, MessageCircle, LogOut, EyeOff } from 'lucide-react';
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
import { logger } from '@/lib/logger';

type NavigationLink = {
  href: string;
  label: string;
  requiresCompletion?: boolean;
};

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { supabase } = useSupabase();
  const { user, loading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const { isComplete, loading: profileLoading } = useProfileCompletion();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingModalData, setRatingModalData] = useState<{
    userId: string;
    nickname: string;
    listingId: number;
    listingTitle: string;
  } | null>(null);

  const toggleMenu = () => setIsMenuOpen(v => !v);
  const closeMenu = () => setIsMenuOpen(false);

  const baseLinks: NavigationLink[] = [
    { href: '/marketplace', label: 'Marketplace', requiresCompletion: true },
    { href: '/mis-plantillas', label: 'Mis Colecciones', requiresCompletion: true },
    { href: '/templates', label: 'Plantillas', requiresCompletion: true },
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

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (!cancelled) setIsAdmin(!!data?.is_admin && !error);
    }
    void checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      closeMenu();
      router.push('/login');
    } catch (error) {
      logger.error('Sign out error:', error);
    }
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

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-gray-900 border-b-2 border-black shadow-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-black uppercase text-white hover:text-[#FFC000] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900 rounded-md px-2 py-1"
            onClick={closeMenu}
          >
            {siteConfig.name}
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
                      'focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900',
                      'data-[current=page]:bg-[#FFC000] data-[current=page]:text-gray-900 data-[current=page]:border-2 data-[current=page]:border-black',
                      'text-white hover:bg-gray-800 border-2 border-transparent'
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

          <button
            type="button"
            className="md:hidden p-2 text-white hover:text-[#FFC000] hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900 rounded-md border-2 border-transparent hover:border-black transition-all duration-200"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
            onClick={toggleMenu}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
          className={cn(
            'md:hidden border-t-2 border-gray-700 bg-gray-800',
            isMenuOpen ? 'block' : 'hidden'
          )}
        >
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Main Navigation Links */}
            <ul className="py-4 space-y-2">
              {navigationLinks.map(link => (
                <li key={link.href}>
                  <NavLink
                    href={link.href}
                    className={cn(
                      'block px-4 py-3 mx-2 rounded-md font-bold uppercase text-base transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-800',
                      'data-[current=page]:bg-[#FFC000] data-[current=page]:text-gray-900 data-[current=page]:border-2 data-[current=page]:border-black',
                      'text-white hover:bg-gray-700 border-2 border-transparent'
                    )}
                    onClick={handleProtectedNavigation(link.requiresCompletion)}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Notifications Section - Only for authenticated users */}
            {!loading && user && (
              <>
                <div className="border-t-2 border-gray-700" />
                <div className="py-4">
                  <Link
                    href="/profile/notifications"
                    onClick={closeMenu}
                    className="flex items-center justify-between px-4 py-3 mx-2 text-white hover:bg-gray-700 transition-colors rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5" />
                      <span className="font-bold">Notificaciones</span>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[1.5rem] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </div>

                {/* User Profile Section */}
                <div className="border-t-2 border-gray-700" />
                <div className="py-4 space-y-1">
                  <Link
                    href={`/users/${user.id}`}
                    onClick={handleProtectedNavigation()}
                    className="flex items-center gap-3 px-4 py-3 mx-2 text-white hover:bg-gray-700 transition-colors rounded-md"
                  >
                    <User className="h-5 w-5" />
                    <span className="font-bold">Mi Perfil</span>
                  </Link>

                  <Link
                    href="/marketplace/my-listings"
                    onClick={handleProtectedNavigation(true)}
                    className="flex items-center gap-3 px-4 py-3 mx-2 text-white hover:bg-gray-700 transition-colors rounded-md"
                  >
                    <Package className="h-5 w-5" />
                    <span className="font-bold">Mis Anuncios</span>
                  </Link>

                  <Link
                    href="/chats"
                    onClick={handleProtectedNavigation(true)}
                    className="flex items-center gap-3 px-4 py-3 mx-2 text-white hover:bg-gray-700 transition-colors rounded-md"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-bold">Chats</span>
                  </Link>

                  <Link
                    href="/favorites"
                    onClick={handleProtectedNavigation()}
                    className="flex items-center gap-3 px-4 py-3 mx-2 text-white hover:bg-gray-700 transition-colors rounded-md"
                  >
                    <Heart className="h-5 w-5" />
                    <span className="font-bold">Favoritos</span>
                  </Link>

                  <Link
                    href="/profile/ignored"
                    onClick={handleProtectedNavigation()}
                    className="flex items-center gap-3 px-4 py-3 mx-2 text-white hover:bg-gray-700 transition-colors rounded-md"
                  >
                    <EyeOff className="h-5 w-5" />
                    <span className="font-bold">Usuarios Ignorados</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      onClick={handleProtectedNavigation()}
                      className="flex items-center gap-3 px-4 py-3 mx-2 text-[#FFC000] hover:bg-gray-700 transition-colors rounded-md font-bold"
                    >
                      <span>Admin Panel</span>
                    </Link>
                  )}

                  <div className="border-t-2 border-gray-700 mt-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-3 mx-2 text-white hover:bg-red-900/20 hover:text-red-400 transition-colors w-full rounded-md"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-bold">Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>
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
