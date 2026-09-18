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
    ? 'text-[9px] px-1.5 py-0.5 gap-0.5'
    : 'text-xs px-2 py-1 gap-1';

  const iconSize = size === 'sm' ? 10 : 14;

  return (
    <span
      className={`inline-flex items-center font-black tracking-wide rounded-full bg-gradient-to-r from-[#FFC000] to-[#F59E0B] text-black shadow-sm shadow-[#FFC000]/40 shrink-0 whitespace-nowrap ${sizeClasses} ${className}`}
    >
      <Crown size={iconSize} className="fill-current" />
      PRO
    </span>
  );
}

/**
 * Wraps an avatar with a golden ring border and a small crown badge for PRO users.
 * Usage: <ProAvatarRing isPro={true}><Avatar ... /></ProAvatarRing>
 *
 * @param size - Controls the crown badge size to match the avatar:
 *   'xs' → 24px avatars (listing cards)
 *   'sm' → 32-40px avatars (header, chat list)
 *   'md' → 48px avatars (profile cards)
 *   'lg' → 64px+ avatars (profile page hero)
 */
export function ProAvatarRing({
  isPro,
  children,
  className = '',
  size = 'sm',
}: {
  isPro: boolean;
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  if (!isPro) return <>{children}</>;

  const badgeSizeClasses = {
    xs: 'w-3 h-3 -bottom-0 -right-0',
    sm: 'w-4 h-4 -bottom-0.5 -right-0.5',
    md: 'w-5 h-5 -bottom-0.5 -right-0.5',
    lg: 'w-6 h-6 -bottom-0.5 -right-0.5',
  };

  const crownSize = {
    xs: 8,
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <div className={`relative inline-flex rounded-full ring-2 ring-[#FFC000] ${className}`}>
      {children}
      {/* PRO crown badge */}
      <span
        className={`absolute ${badgeSizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-[#FFC000] to-[#F59E0B] shadow-sm shadow-[#FFC000]/50 border border-white dark:border-gray-900 z-10`}
      >
        <Crown size={crownSize[size]} className="text-white fill-white" />
      </span>
    </div>
  );
}
