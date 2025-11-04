/**
 * BadgeGrid Component
 * Grid layout for displaying multiple badges
 */

'use client';

import { BadgeCard } from './BadgeCard';
import type { UserBadge, BadgeProgress } from '@/types/badges';
import { cn } from '@/lib/utils';

interface BadgeGridProps {
  badges: (UserBadge | BadgeProgress)[];
  showProgress?: boolean;
  columns?: 1 | 2 | 3 | 4;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  emptyMessage?: string;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

export function BadgeGrid({
  badges,
  showProgress = false,
  columns = 3,
  size = 'medium',
  className,
  emptyMessage = 'No hay insignias para mostrar',
}: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {badges.map((badge) => (
        <BadgeCard
          key={badge.badge_id}
          badge={badge}
          showProgress={showProgress}
          size={size}
        />
      ))}
    </div>
  );
}
