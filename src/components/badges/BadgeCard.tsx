/**
 * BadgeCard Component
 * Displays a single badge with details
 */

'use client';

import { BadgeIcon } from './BadgeIcon';
import { getBadgeTierColors } from '@/config/badges';
import type { UserBadge, BadgeProgress } from '@/types/badges';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BadgeCardProps {
  badge: UserBadge | BadgeProgress;
  showProgress?: boolean;
  showDescription?: boolean;
  showEarnedDate?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  isHighlighted?: boolean;
}

export function BadgeCard({
  badge,
  showProgress = false,
  showDescription = true,
  showEarnedDate = true,
  size = 'medium',
  className,
  isHighlighted = false,
}: BadgeCardProps) {
  const colors = getBadgeTierColors(badge.tier);
  const isProgress = 'is_earned' in badge;
  const isEarned = isProgress ? badge.is_earned : true;

  // Calculate progress percentage for unearned badges
  const progressPercent = isProgress && !badge.is_earned
    ? Math.min((badge.current_progress / badge.threshold) * 100, 100)
    : 100;

  const sizeClasses = {
    small: {
      container: 'p-3',
      icon: 'small' as const,
      title: 'text-sm',
      description: 'text-xs',
    },
    medium: {
      container: 'p-4',
      icon: 'medium' as const,
      title: 'text-base',
      description: 'text-sm',
    },
    large: {
      container: 'p-6',
      icon: 'large' as const,
      title: 'text-lg',
      description: 'text-base',
    },
  };

  const styles = sizeClasses[size];

  return (
    <div
      className={cn(
        'rounded-lg border-2 transition-all duration-200',
        colors.border,
        isEarned ? colors.bg : 'bg-gray-50 opacity-60',
        isEarned && 'hover:shadow-md',
        isHighlighted && 'animate-[highlight_3s_ease-in-out]',
        styles.container,
        className
      )}
      style={
        isHighlighted
          ? {
              animation: 'highlight 3s ease-in-out',
            }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <BadgeIcon
          iconName={badge.icon_name}
          tier={badge.tier}
          size={styles.icon}
          showGlow={isEarned && badge.tier === 'special'}
        />

        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-semibold truncate',
              styles.title,
              isEarned ? colors.text : 'text-gray-500'
            )}
          >
            {badge.display_name_es}
          </h3>

          {showDescription && (
            <p
              className={cn(
                'mt-1',
                styles.description,
                isEarned
                  ? 'text-gray-600'
                  : 'text-gray-400'
              )}
            >
              {badge.description_es}
            </p>
          )}

          {/* Progress bar for unearned badges */}
          {showProgress && isProgress && !badge.is_earned && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>
                  {badge.current_progress} / {badge.threshold}
                </span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    colors.icon.replace('text-', 'bg-')
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Earned date for earned badges */}
          {showEarnedDate && isEarned && 'earned_at' in badge && badge.earned_at && (
            <p className="mt-2 text-xs text-gray-500">
              Ganada el{' '}
              {format(new Date(badge.earned_at), 'dd MMM yyyy', {
                locale: es,
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
