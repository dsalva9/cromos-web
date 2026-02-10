'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, MouseEventHandler, useCallback } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * NavLink — Navigation link with hard-navigation workaround.
 *
 * When the user is authenticated, Next.js 16 / React 19 has a known bug
 * where client-side transitions via `<Link>` silently hang (the RSC payload
 * arrives but React never applies it).  As a workaround, authenticated
 * navigations fall back to `window.location.href` which always works.
 *
 * For unauthenticated users the standard `<Link>` SPA navigation is used.
 */
export default function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const { user } = useUser();

  // Special handling for home route - only exact match
  const isActive = href === '/'
    ? pathname === '/'
    : pathname.startsWith(href);

  const handleClick: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (e) => {
      // Call parent onClick first (e.g. handleProtectedNavigation)
      if (onClick) {
        onClick(e);
        // If parent called preventDefault, bail out — it handles the nav
        if (e.defaultPrevented) return;
      }

      // Workaround: when authenticated, use hard navigation to bypass stuck transition
      if (user) {
        e.preventDefault();
        window.location.href = href;
      }
      // When unauthenticated, let <Link> handle it normally (SPA nav works)
    },
    [onClick, user, href]
  );

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      data-current={isActive ? 'page' : undefined}
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  );
}
