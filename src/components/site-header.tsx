'use client';

import { siteConfig } from '@/config/site';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, Bell } from 'lucide-react';
import NavLink from '@/components/nav-link';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { useNotifications } from '@/hooks/trades/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { supabase } = useSupabase();
  const { user, loading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const { unreadCount } = useNotifications();

  const toggleMenu = () => setIsMenuOpen(v => !v);
  const closeMenu = () => setIsMenuOpen(false);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    closeMenu();
  };

  const baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/templates', label: 'Plantillas' },
    { href: '/mis-plantillas', label: 'Mis Colecciones' },
    { href: '/profile', label: 'Perfil' },
  ];

  const unauthenticatedLinks = [
    { href: '/', label: 'Home' },
    { href: '/login', label: 'Iniciar Sesión' },
    { href: '/signup', label: 'Registrarse' },
  ];

  const navigationLinks = (() => {
    if (!user) return unauthenticatedLinks;
    const links = [...baseLinks];
    if (isAdmin) {
      const profileIndex = links.findIndex(l => l.href === '/profile');
      links.splice(profileIndex >= 0 ? profileIndex : links.length, 0, {
        href: '/admin',
        label: 'Admin',
      });
    }
    return links;
  })();

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

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b-2 border-black shadow-xl">
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
                  {link.href === '/trades/proposals' && unreadCount > 0 ? (
                    <div className="flex items-center gap-1">
                      <NavLink
                        href={link.href}
                        className={cn(
                          'block px-4 py-2 rounded-md font-bold uppercase text-sm transition-all duration-200',
                          'focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900',
                          'data-[current=page]:bg-[#FFC000] data-[current=page]:text-gray-900 data-[current=page]:border-2 data-[current=page]:border-black',
                          'text-white hover:bg-gray-800 border-2 border-transparent'
                        )}
                      >
                        {link.label}
                      </NavLink>
                      <button
                        onClick={e => {
                          e.preventDefault();
                          router.push('/trades/notifications');
                        }}
                        className="flex items-center justify-center rounded-md p-1 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
                        aria-label={`${unreadCount} notificaciones no leídas`}
                        title="Ver notificaciones"
                      >
                        <Badge className="bg-[#E84D4D] text-white border-2 border-black font-bold text-xs px-1.5 py-0.5 cursor-pointer hover:bg-red-600 transition-colors">
                          <Bell className="h-3 w-3 mr-1 inline-block" />
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                      </button>
                    </div>
                  ) : (
                    <NavLink
                      href={link.href}
                      className={cn(
                        'block px-4 py-2 rounded-md font-bold uppercase text-sm transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900',
                        'data-[current=page]:bg-[#FFC000] data-[current=page]:text-gray-900 data-[current=page]:border-2 data-[current=page]:border-black',
                        'text-white hover:bg-gray-800 border-2 border-transparent'
                      )}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
            {!loading && (
              <div className="ml-4">
                {user ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-white hover:text-white hover:bg-[#E84D4D] rounded-md px-4 py-2 font-bold uppercase text-sm transition-all duration-200 border-2 border-transparent hover:border-black focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Salir</span>
                  </Button>
                ) : null}
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
          <ul className="py-4 space-y-2">
            {navigationLinks.map(link => (
              <li key={link.href}>
                {link.href === '/trades/proposals' && unreadCount > 0 ? (
                  <div className="flex items-center justify-between gap-2 mx-2">
                    <NavLink
                      href={link.href}
                      className={cn(
                        'flex-1 block px-4 py-3 rounded-md font-bold uppercase text-base transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-800',
                        'data-[current=page]:bg-[#FFC000] data-[current=page]:text-gray-900 data-[current=page]:border-2 data-[current=page]:border-black',
                        'text-white hover:bg-gray-700 border-2 border-transparent'
                      )}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </NavLink>
                    <button
                      onClick={e => {
                        e.preventDefault();
                        router.push('/trades/notifications');
                        closeMenu();
                      }}
                      className="flex items-center justify-center rounded-md p-2 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-800 transition-all"
                      aria-label={`${unreadCount} notificaciones no leídas`}
                    >
                      <Badge className="bg-[#E84D4D] text-white border-2 border-black font-bold text-xs px-2 py-1 cursor-pointer hover:bg-red-600 transition-colors">
                        <Bell className="h-3 w-3 mr-1 inline-block" />
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    </button>
                  </div>
                ) : (
                  <NavLink
                    href={link.href}
                    className={cn(
                      'block px-4 py-3 mx-2 rounded-md font-bold uppercase text-base transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-800',
                      'data-[current=page]:bg-[#FFC000] data-[current=page]:text-gray-900 data-[current=page]:border-2 data-[current=page]:border-black',
                      'text-white hover:bg-gray-700 border-2 border-transparent'
                    )}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </NavLink>
                )}
              </li>
            ))}
            {!loading && user && (
              <li className="px-2 pt-2 border-t-2 border-gray-700 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start flex items-center space-x-2 text-white hover:text-white hover:bg-[#E84D4D] rounded-md px-4 py-3 font-bold uppercase text-base border-2 border-transparent hover:border-black focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Salir</span>
                </Button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}
