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
 * NavLink — Navigation link with active-state styling.
 *
 * Uses the custom Link component which automatically handles
 * hard navigation for authenticated users.
 */
export default function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const pathname = usePathname();

  // Special handling for home route - only exact match
  const isActive = href === '/'
    ? pathname === '/'
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
