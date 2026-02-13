'use client';

import { usePathname } from 'next/navigation';
import { Store, Library, MessageCircle, Heart, Menu, Package, FileText, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { useRouter } from '@/hooks/use-router';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useHaptic } from '@/hooks/useHaptic';

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const supabase = useSupabaseClient();
  const router = useRouter();

  /* Existing hook calls... */
  const { user, wasAuthed } = useUser(); // Ensure useUser is imported from SupabaseProvider

  // Defer client-only checks to avoid SSR hydration mismatch (React #418)
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  // Hide on desktop
  // We'll use a CSS class to hide it on md+ screens

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
    setIsMenuOpen(false);
  };

  const { hapticImpact } = useHaptic();

  const handleNavClick = (href: string) => {
    hapticImpact();
    // Hard navigation workaround — Next.js 16 client-side transitions
    // silently hang for authenticated users, so bypass via window.location.href
    window.location.href = href;
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
              isActive('/marketplace') ? "text-[#FFC000]" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
              isActive('/mis-plantillas') ? "text-[#FFC000]" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
              isActive('/chats') ? "text-[#FFC000]" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
            aria-label="Chats"
          >
            <MessageCircle className="h-6 w-6" />
          </a>

          <a
            href="/favorites"
            onClick={(e) => { e.preventDefault(); handleNavClick('/favorites'); }}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isActive('/favorites') ? "text-[#FFC000]" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
            aria-label="Favoritos"
          >
            <Heart className="h-6 w-6" />
          </a>

          <button
            onClick={handleMenuClick}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isMenuOpen ? "text-[#FFC000]" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
            <DrawerTitle className="text-center font-bold text-lg">Menú</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            <a
              href="/marketplace/my-listings"
              onClick={(e) => {
                e.preventDefault();
                hapticImpact();
                setIsMenuOpen(false);
                window.location.href = '/marketplace/my-listings';
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Package className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Mis Anuncios</span>
            </a>

            <a
              href="/templates"
              onClick={(e) => {
                e.preventDefault();
                hapticImpact();
                setIsMenuOpen(false);
                window.location.href = '/templates';
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FileText className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Colecciones</span>
            </a>

            <a
              href="/ajustes"
              onClick={(e) => {
                e.preventDefault();
                hapticImpact();
                setIsMenuOpen(false);
                window.location.href = '/ajustes';
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Settings className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Ajustes</span>
            </a>

            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />

            <button
              onClick={() => {
                hapticImpact();
                handleSignOut();
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 w-full transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>

            {/* Legal links — footer is hidden on mobile, these are the mobile equivalent */}
            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
            <div className="flex flex-wrap items-center justify-center gap-3 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              <a
                href="/legal/terms"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = '/legal/terms'; }}
                className="hover:text-[#FFC000] transition-colors"
              >
                Términos
              </a>
              <span>·</span>
              <a
                href="/legal/privacy"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = '/legal/privacy'; }}
                className="hover:text-[#FFC000] transition-colors"
              >
                Privacidad
              </a>
              <span>·</span>
              <a
                href="/legal/cookies"
                onClick={(e) => { e.preventDefault(); hapticImpact(); setIsMenuOpen(false); window.location.href = '/legal/cookies'; }}
                className="hover:text-[#FFC000] transition-colors"
              >
                Cookies
              </a>
            </div>
            <p className="text-center text-[10px] text-gray-300 dark:text-gray-600 pb-1">v1.0 Beta</p>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
