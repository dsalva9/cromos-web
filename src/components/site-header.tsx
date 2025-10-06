'use client';


import { siteConfig } from '@/config/site';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LogOut } from 'lucide-react';
import NavLink from '@/components/nav-link';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { supabase } = useSupabase();
  const { user, loading } = useUser();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    closeMenu();
  };

  // Different navigation based on auth state
  const authenticatedLinks = [
    { href: '/', label: 'Home' },
    { href: '/mi-coleccion', label: 'Mi Colección' },
    { href: '/trades/find', label: 'Intercambios' },
    { href: '/trades/inbox', label: 'Buzón Intercambios' },
    { href: '/profile', label: 'Perfil' },
  ];

  const unauthenticatedLinks = [
    { href: '/', label: 'Home' },
    { href: '/login', label: 'Iniciar Sesión' },
    { href: '/signup', label: 'Registrarse' },
  ];

  const navigationLinks = user ? authenticatedLinks : unauthenticatedLinks;

  return (
    <header className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md border-b border-gray-700/50 shadow-xl">
      {' '}
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-black text-white hover:text-yellow-300 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 rounded-lg"
            onClick={closeMenu}
          >
            {siteConfig.name}
          </Link>

          {/* Desktop Navigation */}
          <nav
            role="navigation"
            aria-label="Main navigation"
            className="hidden md:flex md:items-center md:space-x-1"
          >
            <ul className="flex items-center space-x-1">
              {navigationLinks.map(link => (
                <li key={link.href}>
                  <NavLink
                    href={link.href}
                    className="px-4 py-2 rounded-xl font-semibold text-white/90 hover:text-white hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-1"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Auth Actions */}
            {!loading && (
              <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-white/20">
                {user ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex items-center space-x-2 text-white/90 hover:text-white hover:bg-red-500/20 rounded-xl px-4 py-2 font-semibold transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Salir</span>
                  </Button>
                ) : null}
              </div>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="md:hidden p-2 text-white/90 hover:text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-1 rounded-xl transition-all duration-200"
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

        {/* Mobile Navigation */}
        <nav
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
          className={cn(
            'md:hidden border-t border-white/20 bg-white/10 backdrop-blur-md',
            isMenuOpen ? 'block' : 'hidden'
          )}
        >
          <ul className="py-4 space-y-2">
            {navigationLinks.map(link => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  className="block px-4 py-3 mx-2 rounded-xl font-semibold text-white/90 hover:text-white hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-1"
                  onClick={closeMenu}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}

            {/* Mobile Auth Actions */}
            {!loading && user && (
              <li className="px-2 pt-2 border-t border-white/20 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start flex items-center space-x-2 text-white/90 hover:text-white hover:bg-red-500/20 rounded-xl px-4 py-3 font-semibold"
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



