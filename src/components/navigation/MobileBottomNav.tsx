'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Store, Library, MessageCircle, ArrowLeftRight, Heart, Menu, Package, FileText, Settings, LogOut, Shield, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { useRouter } from '@/hooks/use-router';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useHaptic } from '@/hooks/useHaptic';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useGlobalUnreadBadge } from '@/hooks/trades/useGlobalUnreadBadge';

/** Strip the locale prefix from a pathname for active-state matching. */
function stripLocale(path: string): string {
  return path.replace(/^\/(es|en|pt)/, '') || '/';
}

export function MobileBottomNav() {
  const rawPathname = usePathname();
  const pathname = stripLocale(rawPathname);
  const locale = useLocale();
  const t = useTranslations('navigation');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const supabase = useSupabaseClient();
  const router = useRouter();

  /** Prefix a path with the current locale */
  const lp = (path: string) => `/${locale}${path}`;

  /* Existing hook calls... */
  const { user, wasAuthed } = useUser(); // Ensure useUser is imported from SupabaseProvider

  // Defer client-only checks to avoid SSR hydration mismatch (React #418)
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  // Hide on desktop
  // We'll use a CSS class to hide it on md+ screens

  // Chat pages live under /marketplace/[id]/chat — treat as "chats"
  const isChatPage = pathname?.endsWith('/chat');
  const isActive = (path: string) => {
    if (path === '/chats') return pathname === '/chats' || pathname?.startsWith('/chats/') || !!isChatPage;
    if (path === '/marketplace') return (pathname === '/marketplace' || pathname?.startsWith('/marketplace/')) && !isChatPage;
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = lp('/login');
    setIsMenuOpen(false);
  };

  const { hapticImpact } = useHaptic();
  const { isAdmin } = useProfileCompletion();
  const { totalUnread } = useGlobalUnreadBadge();

  const handleNavClick = (href: string) => {
    hapticImpact();
    // Hard navigation workaround — Next.js 16 client-side transitions
    // silently hang for authenticated users, so bypass via window.location.href
    window.location.href = lp(href);
  };

  const handleMenuClick = () => {
    hapticImpact();
    setIsMenuOpen(true);
  };

  // If user is not logged in (and wasn't previously authed), do not show the bottom nav
  // Before mount, always return null to match SSR output and avoid hydration mismatch
  if (!hasMounted || (!user && !wasAuthed)) {
    return null;
  }

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-[var(--z-nav)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          <a
            href="/marketplace"
            onClick={(e) => { e.preventDefault(); handleNavClick('/marketplace'); }}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isActive('/marketplace') ? "text-gold" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
            aria-label="Marketplace"
          >
            <Store className="h-6 w-6" />
          </a>

          <a
            href="/mis-plantillas"
            onClick={(e) => { e.preventDefault(); handleNavClick('/mis-plantillas'); }}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isActive('/mis-plantillas') ? "text-gold" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
            aria-label="Mis Álbumes"
          >
            <Library className="h-6 w-6" />
          </a>

          <a
            href="/chats"
            onClick={(e) => { e.preventDefault(); handleNavClick('/chats'); }}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isActive('/chats') ? "text-gold" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
            aria-label="Chats"
          >
            <MessageCircle className="h-6 w-6" />
          </a>

          <a
            href="/intercambios/buscar"
            onClick={(e) => { e.preventDefault(); handleNavClick('/intercambios/buscar'); }}
            className={cn(
              "flex items-center justify-center w-full h-full relative",
              isActive('/intercambios') ? "text-gold" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
            aria-label="Matches"
          >
            <ArrowLeftRight className="h-6 w-6" />
            {totalUnread === 0 && (
              <span className="absolute -top-0.5 right-[18%] px-1 py-[1px] rounded text-[7px] font-black uppercase bg-red-500 text-white leading-none">
                NEW
              </span>
            )}
            {totalUnread > 0 && (
              <span className="absolute top-1 right-1/4 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </a>

          <button
            onClick={handleMenuClick}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isMenuOpen ? "text-gold" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
            aria-label="Menú"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* More Menu Drawer */}
      <Drawer open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DrawerContent className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-black dark:text-white pb-[env(safe-area-inset-bottom)] z-[var(--z-modal)]">
          <DrawerHeader className="border-b border-gray-100 dark:border-gray-800 mb-2">
            <DrawerTitle className="text-center font-bold text-lg">{t('menu')}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            <a
              href="/marketplace/my-listings"
              onClick={(e) => {
                e.preventDefault();
                hapticImpact();
                setIsMenuOpen(false);
                window.location.href = lp('/marketplace/my-listings');
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Package className="h-5 w-5 text-gold" />
              <span className="font-medium">{t('myListings')}</span>
            </a>

            <a
              href="/templates"
              onClick={(e) => {
                e.preventDefault();
                hapticImpact();
                setIsMenuOpen(false);
                window.location.href = lp('/templates');
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FileText className="h-5 w-5 text-gold" />
              <span className="font-medium">{t('collections')}</span>
            </a>

            <a
              href="/blog"
              onClick={(e) => {
                e.preventDefault();
                hapticImpact();
                setIsMenuOpen(false);
                window.location.href = lp('/blog');
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <BookOpen className="h-5 w-5 text-gold" />
              <span className="font-medium">{t('blog')}</span>
            </a>

            <a
              href="/favorites"
              onClick={(e) => {
                e.preventDefault();
                hapticImpact();
                setIsMenuOpen(false);
                window.location.href = lp('/favorites');
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Heart className="h-5 w-5 text-gold" />
              <span className="font-medium">{t('favorites')}</span>
            </a>

            <a
              href="/ajustes"
              onClick={(e) => {
                e.preventDefault();
                hapticImpact();
                setIsMenuOpen(false);
                window.location.href = lp('/ajustes');
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="h-5 w-5 text-gold" />
              <span className="font-medium">{t('settings')}</span>
            </a>

            {isAdmin && (
              <a
                href="/admin/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  hapticImpact();
                  setIsMenuOpen(false);
                  window.location.href = lp('/admin/dashboard');
                }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Shield className="h-5 w-5 text-red-500" />
                <span className="font-medium">Admin Panel</span>
              </a>
            )}

            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />

            <button
              onClick={() => {
                hapticImpact();
                handleSignOut();
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 w-full transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">{t('logout')}</span>
            </button>

            {/* Legal links — footer is hidden on mobile, these are the mobile equivalent */}
            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
            <div className="flex flex-wrap items-center justify-center gap-3 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              <a
                href="/legal/terms"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = lp('/legal/terms'); }}
                className="hover:text-gold transition-colors"
              >
                {t('terms')}
              </a>
              <span>·</span>
              <a
                href="/legal/privacy"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = lp('/legal/privacy'); }}
                className="hover:text-gold transition-colors"
              >
                {t('privacy')}
              </a>
              <span>·</span>
              <a
                href="/legal/cookies"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = lp('/legal/cookies'); }}
                className="hover:text-gold transition-colors"
              >
                {t('cookies')}
              </a>
              <span>·</span>
              <a
                href="/legal/faq"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = lp('/legal/faq'); }}
                className="hover:text-gold transition-colors"
              >
                {t('faq')}
              </a>
              <span>·</span>
              <a
                href="/legal/contact"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = lp('/legal/contact'); }}
                className="hover:text-gold transition-colors"
              >
                {t('contact')}
              </a>
              <span>·</span>
              <a
                href="/legal/about"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = lp('/legal/about'); }}
                className="hover:text-gold transition-colors"
              >
                {t('about')}
              </a>
            </div>
            <p className="text-center text-[10px] text-gray-300 dark:text-gray-600 pb-1">v1.0 Beta</p>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
