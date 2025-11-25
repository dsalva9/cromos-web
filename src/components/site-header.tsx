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

import { useCurrentUserProfile } from '@/hooks/social/useCurrentUserProfile';
import { resolveAvatarUrl, getAvatarFallback } from '@/lib/profile/resolveAvatarUrl';
import Image from 'next/image';

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
    <Link href={`/users/${userId}`} className="block">
      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-black hover:border-[#FFC000] transition-colors">
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
    { href: '/mis-plantillas', label: 'Mis Álbumes', requiresCompletion: true },
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
    <header className="fixed top-0 left-0 right-0 z-[100] bg-gray-900 border-b-2 border-black shadow-xl" style={{ paddingTop: 'var(--sat, 0px)' }}>
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

          <div className="flex items-center gap-2 md:hidden">
            {!loading && user && (
              <>
                <NotificationDropdown onOpenRatingModal={handleOpenRatingModal} />
                <MobileUserAvatar userId={user.id} />
              </>
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
