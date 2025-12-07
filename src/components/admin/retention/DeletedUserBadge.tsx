'use client';

import { Trash2, Clock, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Profile {
  deleted_at: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
}

interface DeletedUserBadgeProps {
  user: Profile;
  scheduledFor?: string | null;
  className?: string;
}

export function DeletedUserBadge({ user, scheduledFor, className = '' }: DeletedUserBadgeProps) {
  // Not deleted or suspended
  if (!user.deleted_at && !user.suspended_at) {
    return null;
  }

  const calculateDaysRemaining = (scheduledDate: string | null) => {
    if (!scheduledDate) return null;
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const diffTime = scheduled.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysRemaining = scheduledFor ? calculateDaysRemaining(scheduledFor) : null;

  // User self-deleted account
  if (user.deleted_at && !user.suspended_at) {
    return (
      <Badge
        variant="destructive"
        className={`inline-flex items-center gap-2 px-3 py-1.5 ${className}`}
      >
        <Trash2 className="h-4 w-4" />
        <span className="font-semibold">USUARIO ELIMINADO</span>
        {daysRemaining !== null && (
          <span className="text-xs opacity-90">
            ({daysRemaining} días hasta permanente)
          </span>
        )}
      </Badge>
    );
  }

  // Admin suspended (with or without deletion schedule)
  if (user.suspended_at) {
    if (scheduledFor && daysRemaining !== null) {
      // Suspended + moved to deletion
      return (
        <Badge
          variant="destructive"
          className={`inline-flex items-center gap-2 px-3 py-1.5 ${className}`}
        >
          <Ban className="h-4 w-4" />
          <span className="font-semibold">SUSPENDIDO</span>
          <span className="text-xs opacity-90">
            - Eliminación en {daysRemaining} días
          </span>
        </Badge>
      );
    } else {
      // Suspended indefinitely (not scheduled for deletion)
      return (
        <Badge
          className={`inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 ${className}`}
        >
          <Ban className="h-4 w-4" />
          <span className="font-semibold">SUSPENDIDO</span>
          <span className="text-xs opacity-90">(indefinido)</span>
        </Badge>
      );
    }
  }

  return null;
}
