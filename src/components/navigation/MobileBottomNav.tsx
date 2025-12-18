'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, Library, MessageCircle, Heart, Menu, Package, FileText, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useHaptic } from '@/hooks/useHaptic';

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { supabase } = useSupabase();
  const router = useRouter();

  // Hide on desktop
  // We'll use a CSS class to hide it on md+ screens

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    setIsMenuOpen(false);
  };


  const { hapticImpact } = useHaptic();

  const handleNavClick = () => {
    hapticImpact();
  };

  const handleMenuClick = () => {
    hapticImpact();
    setIsMenuOpen(true);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[var(--z-nav)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          <Link
            href="/marketplace"
            onClick={handleNavClick}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isActive('/marketplace') ? "text-[#FFC000]" : "text-gray-500 hover:text-gray-900"
            )}
            aria-label="Marketplace"
          >
            <Store className="h-6 w-6" />
          </Link>

          <Link
            href="/mis-plantillas"
            onClick={handleNavClick}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isActive('/mis-plantillas') ? "text-[#FFC000]" : "text-gray-500 hover:text-gray-900"
            )}
            aria-label="Mis Álbumes"
          >
            <Library className="h-6 w-6" />
          </Link>

          <Link
            href="/chats"
            onClick={handleNavClick}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isActive('/chats') ? "text-[#FFC000]" : "text-gray-500 hover:text-gray-900"
            )}
            aria-label="Chats"
          >
            <MessageCircle className="h-6 w-6" />
          </Link>

          <Link
            href="/favorites"
            onClick={handleNavClick}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isActive('/favorites') ? "text-[#FFC000]" : "text-gray-500 hover:text-gray-900"
            )}
            aria-label="Favoritos"
          >
            <Heart className="h-6 w-6" />
          </Link>

          <button
            onClick={handleMenuClick}
            className={cn(
              "flex items-center justify-center w-full h-full",
              isMenuOpen ? "text-[#FFC000]" : "text-gray-500 hover:text-gray-900"
            )}
            aria-label="Menú"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* More Menu Drawer */}
      <Drawer open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DrawerContent className="bg-white border-t border-gray-200 text-black pb-[env(safe-area-inset-bottom)] z-[var(--z-modal)]">
          <DrawerHeader className="border-b border-gray-100 mb-2">
            <DrawerTitle className="text-center font-bold text-lg">Menú</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            <Link
              href="/marketplace/my-listings"
              onClick={() => {
                hapticImpact();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Package className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Mis Anuncios</span>
            </Link>

            <Link
              href="/templates"
              onClick={() => {
                hapticImpact();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Plantillas</span>
            </Link>

            <Link
              href="/ajustes"
              onClick={() => {
                hapticImpact();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Ajustes</span>
            </Link>

            <div className="h-px bg-gray-200 my-2" />

            <button
              onClick={() => {
                hapticImpact();
                handleSignOut();
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-red-600 w-full transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
