'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

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
      onClick={onClick}
      className={cn(
        'transition-colors',
        isActive
          ? 'text-[var(--brand)] font-medium'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      {children}
    </Link>
  );
}
