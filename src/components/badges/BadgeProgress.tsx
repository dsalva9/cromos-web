/**
 * BadgeProgress Component
 * Shows progress towards earning a badge
 */

'use client';

import { BadgeIcon } from './BadgeIcon';
import { getBadgeTierColors } from '@/config/badges';
import type { BadgeProgress as BadgeProgressType, BadgeTier } from '@/types/badges';
import { cn } from '@/lib/utils';

interface BadgeProgressProps {
  badge: BadgeProgressType;
  orientation?: 'horizontal' | 'vertical';
  showPercentage?: boolean;
  className?: string;
}

export function BadgeProgress({
  badge,
  orientation = 'horizontal',
  showPercentage = true,
  className,
}: BadgeProgressProps) {
  const colors = getBadgeTierColors(badge.tier);
  const progressPercent = badge.is_earned
    ? 100
    : Math.min((badge.current_progress / badge.threshold) * 100, 100);

  if (orientation === 'vertical') {
    return (
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <BadgeIcon
          iconName={badge.icon_name}
          tier={badge.tier}
          size="medium"
          showGlow={badge.is_earned && badge.tier === 'special'}
        />

        <div className="w-full">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={cn('font-medium', colors.text)}>
              {badge.display_name_es}
            </span>
            {showPercentage && (
              <span className="text-gray-500">
                {Math.round(progressPercent)}%
              </span>
            )}
          </div>

          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                colors.icon.replace('text-', 'bg-')
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {badge.current_progress} / {badge.threshold}
          </p>
        </div>
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BadgeIcon
        iconName={badge.icon_name}
        tier={badge.tier}
        size="medium"
        showGlow={badge.is_earned && badge.tier === 'special'}
      />

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className={cn('text-sm font-medium', colors.text)}>
            {badge.display_name_es}
          </span>
          {showPercentage && (
            <span className="text-xs text-gray-500">
              {Math.round(progressPercent)}%
            </span>
          )}
        </div>

        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500',
              colors.icon.replace('text-', 'bg-')
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-gray-500 mt-1">
          {badge.current_progress} / {badge.threshold}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact progress indicator (just the bar)
 */
interface BadgeProgressBarProps {
  current: number;
  threshold: number;
  tier: string;
  className?: string;
}

export function BadgeProgressBar({
  current,
  threshold,
  tier,
  className,
}: BadgeProgressBarProps) {
  const colors = getBadgeTierColors(tier as BadgeTier);
  const progressPercent = Math.min((current / threshold) * 100, 100);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>
          {current} / {threshold}
        </span>
        <span>{Math.round(progressPercent)}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            colors.icon.replace('text-', 'bg-')
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
