'use client';

import { Crown } from 'lucide-react';

interface ProBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Golden PRO badge with crown icon.
 * Renders inline next to nicknames to indicate PRO status.
 */
export function ProBadge({ size = 'sm', className = '' }: ProBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-0.5 gap-1';

  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full bg-gradient-to-r from-[#FFC000] to-[#F59E0B] text-black ${sizeClasses} ${className}`}
    >
      <Crown size={iconSize} className="fill-current" />
      PRO
    </span>
  );
}

/**
 * Wraps an avatar with a golden ring border for PRO users.
 * Usage: <ProAvatarRing isPro={true}><Avatar ... /></ProAvatarRing>
 */
export function ProAvatarRing({
  isPro,
  children,
  className = '',
}: {
  isPro: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!isPro) return <>{children}</>;

  return (
    <div className={`relative rounded-full ring-2 ring-[#FFC000] ${className}`}>
      {children}
    </div>
  );
}
