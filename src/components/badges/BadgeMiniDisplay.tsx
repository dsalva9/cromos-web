/**
 * BadgeMiniDisplay Component
 * Compact badge display for cards, chat headers, and inline display
 */

'use client';

import { BadgeIcon } from './BadgeIcon';
import type { UserBadge } from '@/types/badges';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BadgeMiniDisplayProps {
  badge: UserBadge;
  size?: 'tiny' | 'small';
  showTooltip?: boolean;
  className?: string;
}

export function BadgeMiniDisplay({
  badge,
  size = 'small',
  showTooltip = true,
  className,
}: BadgeMiniDisplayProps) {
  const iconSize = size === 'tiny' ? 'small' : 'medium';

  const badgeIcon = (
    <BadgeIcon
      iconName={badge.icon_name}
      tier={badge.tier}
      size={iconSize}
      showGlow={badge.tier === 'special'}
      className={cn(size === 'tiny' && 'scale-75', className)}
    />
  );

  if (!showTooltip) {
    return badgeIcon;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-help">{badgeIcon}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-sm">
            <p className="font-semibold">{badge.display_name_es}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {badge.description_es}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Display multiple badges inline
 */
interface BadgeMiniListProps {
  badges: UserBadge[];
  maxDisplay?: number;
  size?: 'tiny' | 'small';
  className?: string;
}

export function BadgeMiniList({
  badges,
  maxDisplay = 3,
  size = 'small',
  className,
}: BadgeMiniListProps) {
  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {displayBadges.map((badge) => (
        <BadgeMiniDisplay
          key={badge.badge_id}
          badge={badge}
          size={size}
          showTooltip={true}
        />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          +{remaining}
        </span>
      )}
    </div>
  );
}
