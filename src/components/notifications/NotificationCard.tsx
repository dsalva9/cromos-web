/**
 * NotificationCard Component
 * Sprint 15: Notifications System
 * Displays individual notifications with actions
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { FormattedNotification } from '@/types/notifications';
import { getRelativeTimeString } from '@/lib/notifications/formatter';
import {
  Bell,
  MessageSquare,
  ShoppingCart,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface NotificationCardProps {
  notification: FormattedNotification;
  onMarkAsRead?: (id: number) => void;
  onOpenRatingModal?: (userId: string, nickname: string, listingId: number, listingTitle: string) => void;
  compact?: boolean;
}

const iconMap = {
  Bell,
  MessageSquare,
  ShoppingCart,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
};

export function NotificationCard({
  notification,
  onMarkAsRead,
  onOpenRatingModal,
  compact = false,
}: NotificationCardProps) {
  const isUnread = !notification.readAt;
  const IconComponent = iconMap[notification.icon as keyof typeof iconMap] || Bell;

  const handleClick = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleRateUser = () => {
    if (onOpenRatingModal && notification.actor && notification.listingId && notification.listingTitle) {
      onOpenRatingModal(
        notification.actor.id,
        notification.actor.nickname,
        notification.listingId,
        notification.listingTitle
      );
      if (isUnread && onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
    }
  };

  // Check if this is a listing_completed notification that needs rating
  const needsRating = notification.kind === 'listing_completed' &&
    !notification.payload?.needs_confirmation; // Seller sees this (buyer already confirmed)

  return (
    <Card
      className={`
        transition-all duration-200
        ${isUnread ? 'border-l-4 border-l-comic-accent bg-comic-accent/5' : 'border-l-4 border-l-transparent'}
        ${compact ? 'py-2' : 'py-3'}
      `}
      onClick={handleClick}
    >
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start gap-3">
          {/* Icon/Avatar */}
          <div className="flex-shrink-0">
            {notification.actor?.avatarUrl ? (
              <Avatar className="h-10 w-10">
                <AvatarImage src={notification.actor.avatarUrl} alt={notification.actor.nickname} />
                <AvatarFallback>
                  {notification.actor.nickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-comic-accent/10">
                <IconComponent className="h-5 w-5 text-comic-accent" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-comic-dark">
                  {notification.title}
                </p>
                <p className="text-sm text-comic-muted mt-1">
                  {notification.body}
                </p>
              </div>

              {/* Unread indicator */}
              {isUnread && (
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-comic-accent" />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-comic-muted">
                {getRelativeTimeString(notification.createdAt)}
              </span>

              {/* Status badges */}
              {notification.listingStatus === 'suspended' && (
                <Badge variant="destructive" className="text-xs">
                  Suspendido
                </Badge>
              )}
              {notification.templateStatus === 'suspended' && (
                <Badge variant="destructive" className="text-xs">
                  Suspendido
                </Badge>
              )}
            </div>

            {/* Actions */}
            {!compact && (
              <div className="mt-3 flex gap-2">
                {/* Rating button for completed transactions */}
                {needsRating && onOpenRatingModal && (
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs bg-[#FFC000] text-black hover:bg-[#FFD700]"
                    onClick={handleRateUser}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Valorar usuario
                  </Button>
                )}

                {/* Default link button */}
                {notification.href && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    asChild
                  >
                    <Link href={notification.href}>
                      {notification.kind === 'listing_chat' || notification.kind === 'chat_unread'
                        ? 'Ir al chat'
                        : notification.kind === 'listing_completed' && notification.payload?.needs_confirmation
                        ? 'Confirmar transacción'
                        : notification.kind.includes('rating')
                        ? 'Ver valoración'
                        : 'Ver detalles'}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
