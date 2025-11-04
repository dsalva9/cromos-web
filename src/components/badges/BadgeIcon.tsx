/**
 * BadgeIcon Component
 * Displays a badge icon with tier-specific styling
 */

'use client';

import { getBadgeIcon, getBadgeTierColors } from '@/config/badges';
import type { BadgeTier } from '@/types/badges';
import { cn } from '@/lib/utils';

interface BadgeIconProps {
  iconName: string;
  tier: BadgeTier;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showGlow?: boolean;
}

const sizeClasses = {
  small: 'w-4 h-4',
  medium: 'w-6 h-6',
  large: 'w-8 h-8',
};

export function BadgeIcon({
  iconName,
  tier,
  size = 'medium',
  className,
  showGlow = false,
}: BadgeIconProps) {
  const Icon = getBadgeIcon(iconName);
  const colors = getBadgeTierColors(tier);

  if (!Icon) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full p-1.5',
        colors.bg,
        colors.border,
        'border-2',
        showGlow && tier === 'special' && 'shadow-lg',
        showGlow && tier === 'special' && colors.glow,
        className
      )}
    >
      <Icon className={cn(sizeClasses[size], colors.icon)} />
    </div>
  );
}
