/**
 * NotificationDropdown Component
 * Sprint 15: Notifications System
 * Mini notification panel for the header
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { NotificationCard } from './NotificationCard';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { Bell, ExternalLink } from 'lucide-react';

interface NotificationDropdownProps {
  /** Maximum number of notifications to show in dropdown */
  maxItems?: number;
  /** Callback to open rating modal from notification */
  onOpenRatingModal?: (userId: string, nickname: string, listingId: number, listingTitle: string) => void;
}

export function NotificationDropdown({ maxItems = 5, onOpenRatingModal }: NotificationDropdownProps) {
  const { unreadNotifications, unreadCount, markAsRead, loading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const displayNotifications = unreadNotifications.slice(0, maxItems);
  const hasMore = unreadNotifications.length > maxItems;

  const handleMarkAsRead = (id: number) => {
    markAsRead(id);
  };

  const handleOpenRatingModal = (userId: string, nickname: string, listingId: number, listingTitle: string) => {
    setIsOpen(false); // Close dropdown
    onOpenRatingModal?.(userId, nickname, listingId, listingTitle);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Loading State */}
        {loading && (
          <div className="p-4 text-center text-sm text-comic-muted">
            Cargando...
          </div>
        )}

        {/* Empty State */}
        {!loading && displayNotifications.length === 0 && (
          <div className="p-6 text-center">
            <Bell className="h-12 w-12 mx-auto text-comic-muted mb-2 opacity-50" />
            <p className="text-sm text-comic-muted">
              No tienes notificaciones nuevas
            </p>
          </div>
        )}

        {/* Notifications List */}
        {!loading && displayNotifications.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className="border-b last:border-b-0"
              >
                <NotificationCard
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onOpenRatingModal={handleOpenRatingModal}
                  onNavigate={() => setIsOpen(false)}
                  compact={false}
                />
              </div>
            ))}
          </div>
        )}

        {/* View All Link - Always visible */}
        {!loading && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/profile/notifications"
                className="w-full flex items-center justify-center gap-2 py-2 text-center font-medium text-comic-accent"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones
                <ExternalLink className="h-4 w-4" />
              </Link>
            </DropdownMenuItem>
            {hasMore && (
              <div className="px-2 pb-2 text-xs text-center text-comic-muted">
                y {unreadNotifications.length - maxItems} más...
              </div>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
