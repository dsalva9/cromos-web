'use client';

import Link from '@/components/ui/link';
import { usePathname } from 'next/navigation';
import { ReactNode, MouseEventHandler } from 'react';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * Strip the locale prefix (e.g. /es, /en, /pt) from a pathname.
 * Returns the path without the locale segment for matching.
 */
function stripLocale(path: string): string {
  return path.replace(/^\/(es|en|pt)/, '') || '/';
}

/**
 * NavLink — Navigation link with active-state styling.
 *
 * Uses the custom Link component which automatically handles
 * hard navigation for authenticated users.
 */
export default function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const rawPathname = usePathname();
  // Strip locale prefix so matching works against non-prefixed hrefs
  const pathname = stripLocale(rawPathname);

  // Special handling for home route - only exact match
  // Chat pages live under /marketplace/[id]/chat but belong to the "Chats" section
  const isChatPage = pathname.endsWith('/chat');
  const isActive = href === '/'
    ? pathname === '/'
    : href === '/chats'
      ? pathname.startsWith('/chats') || isChatPage
      : href === '/marketplace'
        ? pathname.startsWith('/marketplace') && !isChatPage
        : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      data-current={isActive ? 'page' : undefined}
      onClick={onClick}
      className={className}
    >
      {children}
    </Link>
  );
}
