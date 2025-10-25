'use client';

import { siteConfig } from '@/config/site';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import NavLink from '@/components/nav-link';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { cn } from '@/lib/utils';
import { UserAvatarDropdown } from '@/components/profile/UserAvatarDropdown';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { supabase } = useSupabase();
  const { user, loading } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleMenu = () => setIsMenuOpen(v => !v);
  const closeMenu = () => setIsMenuOpen(false);

  const baseLinks = [
    { href: '/', label: 'Home' },
    { href: '/marketplace', label: 'Marketplace' },
    { href: '/mis-plantillas', label: 'Mis Colecciones' },
    { href: '/templates', label: 'Plantillas' },
  ];

  const unauthenticatedLinks = [
    { href: '/', label: 'Home' },
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
                    onClick={closeMenu}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            {!loading && user && (
              <div className="ml-4 flex items-center gap-2">
                <NotificationDropdown />
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
                  onClick={closeMenu}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
