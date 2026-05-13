'use client';

import { siteConfig } from '@/config/site';
import { useState, useEffect, useRef, MouseEvent } from 'react';
import Link from '@/components/ui/link';
import NavLink from '@/components/nav-link';
import {
  useSupabaseClient,
  useUser,
} from '@/components/providers/SupabaseProvider';
import { cn } from '@/lib/utils';
import { UserAvatarDropdown } from '@/components/profile/UserAvatarDropdown';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useRouter } from '@/hooks/use-router';
import { useLocale, useTranslations } from 'next-intl';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { toast } from 'sonner';
import { GlobalRatingModal } from '@/components/marketplace/GlobalRatingModal';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { Capacitor } from '@capacitor/core';


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
  const { profile } = useProfileCompletion();
  const supabase = useSupabaseClient();

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url, supabase);
  const fallback = getAvatarFallback(profile?.nickname);

  return (
    <Link href={`/users/${userId}`} className="block shrink-0">
      <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-black dark:border-white hover:border-gold dark:hover:border-gold transition-colors">
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
    <Link href="/profile/notifications" className="p-2 text-gray-700 dark:text-gray-300 hover:text-gold dark:hover:text-gold transition-colors shrink-0">
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
  const supabase = useSupabaseClient();
  const { user, loading, wasAuthed } = useUser();
  // isAdmin now comes from ProfileCompletionProvider - eliminates separate query
  const { isComplete, isAdmin, loading: profileLoading } = useProfileCompletion();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('header');
  const { enabled: i18nEnabled } = useFeatureFlag('i18n');
  const { handleOpenRatingModal, ratingModalElement } = GlobalRatingModal();

  // Defer client-only values to avoid SSR hydration mismatch (React #418)
  const mounted = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { mounted.current = true; setHasMounted(true); }, []);

  const closeMenu = () => setIsMenuOpen(false);

  const baseLinks: NavigationLink[] = [
    { href: '/marketplace', label: t('marketplace'), requiresCompletion: true },
    { href: '/mis-plantillas', label: t('myAlbums'), requiresCompletion: true },
    { href: '/chats', label: t('chats'), requiresCompletion: true },
    { href: '/favorites', label: t('favorites'), requiresCompletion: true },
  ];

  const unauthenticatedLinks: NavigationLink[] = [
    { href: '/login', label: t('login') },
    { href: '/signup', label: t('signup') },
  ];

  // While loading + wasAuthed, render authenticated links (CSS hides them via auth-dependent)
  // Once loading resolves, show correct links based on actual auth state
  // Before mount, always render [] to match SSR output and avoid hydration mismatch
  const navigationLinks = !hasMounted
    ? []
    : loading
      ? (wasAuthed ? baseLinks : [])
      : (user ? baseLinks : unauthenticatedLinks);

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
        // Block navigation for incomplete profiles and redirect to completion page.
        if (
          requiresCompletion &&
          user &&
          !profileLoading &&
          !isComplete
        ) {
          event.preventDefault();
          closeMenu();
          toast.info(t('completeProfile'));
          // Hard redirect — router.push gets stuck due to Next.js 16 transition bug
          window.location.href = `/${locale}/profile/completar`;
          return;
        }

        closeMenu();
      };



  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(min-width: 640px)');
    const update = () => {
      const isSm = mq.matches;
      root.style.setProperty('--header-height', isSm ? '5rem' : '4rem');
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm" style={{ paddingTop: 'var(--sat, 0px)' }}>


      <div className="container mx-auto px-4">
        <div className="flex h-16 sm:h-20 items-center justify-between">
          <NavLink
            href={user ? '/dashboard' : '/'}
            className="flex items-center gap-3 text-2xl font-black uppercase text-gray-900 dark:text-white hover:text-gold dark:hover:text-gold transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 rounded-md px-2 py-1"
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
          </NavLink>

          <nav
            role="navigation"
            aria-label="Main navigation"
            className="hidden md:flex md:items-center md:space-x-2 auth-dependent"
          >
            <ul className="flex items-center space-x-2">
              {navigationLinks.map(link => (
                <li key={link.href} className="relative">
                  <NavLink
                    href={link.href}
                    className={cn(
                      'block px-4 py-2 rounded-md font-bold uppercase text-sm transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900',
                      'data-[current=page]:bg-gold data-[current=page]:text-black data-[current=page]:dark:text-black',
                      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gold dark:hover:text-gold'
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
            {i18nEnabled && <LanguageSelector />}
          </nav>

          <div className="flex items-center gap-2 md:hidden auth-dependent">
            {i18nEnabled && <LanguageSelector />}
            {!hasMounted || loading ? (
              /* Invisible spacer to prevent layout shift while auth loads */
              <div className="w-10 h-10" />
            ) : (
              user ? (
                <>
                  <MobileNotificationIcon />
                  <MobileUserAvatar userId={user.id} />
                </>
              ) : (
                !(hasMounted && Capacitor.isNativePlatform()) && (
                  <Link
                    href="/login"
                    className="text-sm font-bold uppercase text-gray-900 dark:text-white px-3 py-1 border-2 border-black dark:border-white rounded-md hover:bg-gold hover:text-black transition-colors"
                  >
                    {t('enter')}
                  </Link>
                )
              )
            )}
          </div>
        </div>
      </div>



      {/* Rating Modal */}
      {ratingModalElement}
    </header>
  );
}
