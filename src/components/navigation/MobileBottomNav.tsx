'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Store, Library, MessageCircle, Heart, Menu, Package, FileText, Settings, EyeOff, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

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

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          <Link
            href="/marketplace"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isActive('/marketplace') ? "text-[#FFC000]" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Store className="h-6 w-6" />
            <span className="text-[10px] font-medium">Market</span>
          </Link>

          <Link
            href="/mis-plantillas"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isActive('/mis-plantillas') ? "text-[#FFC000]" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Library className="h-6 w-6" />
            <span className="text-[10px] font-medium">Álbumes</span>
          </Link>

          <Link
            href="/chats"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isActive('/chats') ? "text-[#FFC000]" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-[10px] font-medium">Chats</span>
          </Link>

          <Link
            href="/favorites"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isActive('/favorites') ? "text-[#FFC000]" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Heart className="h-6 w-6" />
            <span className="text-[10px] font-medium">Favoritos</span>
          </Link>

          <button
            onClick={() => setIsMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1",
              isMenuOpen ? "text-[#FFC000]" : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Menu className="h-6 w-6" />
            <span className="text-[10px] font-medium">Menú</span>
          </button>
        </div>
      </nav>

      {/* More Menu Drawer */}
      <Drawer open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DrawerContent className="bg-gray-900 border-t border-gray-800 text-white pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="border-b border-gray-800 mb-2">
            <DrawerTitle className="text-center font-bold text-lg">Menú</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            <Link
              href="/marketplace/my-listings"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Package className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Mis Anuncios</span>
            </Link>

            <Link
              href="/templates"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <FileText className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Plantillas</span>
            </Link>

            <Link
              href="/profile/ignored"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <EyeOff className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Usuarios Ignorados</span>
            </Link>

            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors opacity-50 cursor-not-allowed"
            >
              <Settings className="h-5 w-5 text-[#FFC000]" />
              <span className="font-medium">Ajustes (Próximamente)</span>
            </Link>

            <div className="h-px bg-gray-800 my-2" />

            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-900/20 text-red-400 w-full transition-colors"
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
