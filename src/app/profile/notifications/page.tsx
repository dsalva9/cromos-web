/**
 * Notifications Center Page
 * Sprint 15: Notifications System
 */

'use client';

import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { useNotifications } from '@/hooks/notifications/useNotifications';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { logger } from '@/lib/logger';
import { UserRatingDialog } from '@/components/marketplace/UserRatingDialog';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

function NotificationsCenterContent() {
  const {
    unreadNotifications,
    readNotifications,
    unreadCount,
    loading,
    error,
    markAllAsRead,
    markAsRead,
  } = useNotifications();
  const supabase = useSupabaseClient();

  const [activeTab, setActiveTab] = useState<'unread' | 'history'>('unread');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingModalData, setRatingModalData] = useState<{
    userId: string;
    nickname: string;
    listingId: number;
    listingTitle: string;
  } | null>(null);

  // Mark visible notifications as read when switching to "unread" tab
  useEffect(() => {
    if (activeTab === 'unread' && unreadNotifications.length > 0) {
      // Auto-mark as read after viewing (delayed to give user time to see them)
      const timer = setTimeout(() => {
        logger.info('Auto-marking visible notifications as read');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [activeTab, unreadNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      logger.error('Error marking all as read:', err);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
    } catch (err) {
      logger.error('Error marking notification as read:', err);
    }
  };

  const handleOpenRatingModal = (userId: string, nickname: string, listingId: number, listingTitle: string) => {
    setRatingModalData({ userId, nickname, listingId, listingTitle });
    setShowRatingModal(true);
  };

  const handleSubmitRating = async (rating: number, comment?: string) => {
    if (!ratingModalData) return;

    const { error } = await supabase.rpc('create_user_rating', {
      p_rated_id: ratingModalData.userId,
      p_rating: rating,
      p_comment: comment || undefined,
      p_context_type: 'listing',
      p_context_id: ratingModalData.listingId
    });

    if (error) {
      throw new Error(error.message);
    }
  };

  // Group notifications by category for current tab
  const currentNotifications = activeTab === 'unread' ? unreadNotifications : readNotifications;

  const categorizedNotifications = {
    marketplace: currentNotifications.filter((n) => n.category === 'marketplace'),
    templates: currentNotifications.filter((n) => n.category === 'templates'),
    community: currentNotifications.filter((n) => n.category === 'community'),
    trades: currentNotifications.filter((n) => n.category === 'trades'),
    system: currentNotifications.filter((n) => n.category === 'system'),
  };

  const categoryLabels = {
    marketplace: 'Marketplace',
    templates: 'Colecciones',
    community: 'Comunidad',
    trades: 'Intercambios',
    system: 'Sistema',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
                Notificaciones
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Mantente al día con todas tus actividades
              </p>
            </div>

            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                className="gap-2 w-full sm:w-auto shrink-0"
              >
                <CheckCheck className="h-4 w-4" />
                Marcar todas como leídas
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'unread' | 'history')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="unread" className="gap-2">
              <Bell className="h-4 w-4" />
              Nuevas
              {unreadCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-[#FFC000] text-black text-xs rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Inbox className="h-4 w-4" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Unread Tab */}
          <TabsContent value="unread" className="space-y-6">
            {loading && (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                Cargando notificaciones...
              </div>
            )}

            {!loading && unreadNotifications.length === 0 && (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  No hay notificaciones nuevas
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Estás al día con todas tus actividades
                </p>
              </div>
            )}

            {!loading && unreadNotifications.length > 0 && (
              <>
                {Object.entries(categorizedNotifications).map(([category, notifications]) => {
                  if (notifications.length === 0) return null;

                  return (
                    <div key={category}>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </h2>
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <NotificationCard
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onOpenRatingModal={handleOpenRatingModal}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            {loading && (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                Cargando historial...
              </div>
            )}

            {!loading && readNotifications.length === 0 && (
              <div className="text-center py-12">
                <Inbox className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  No hay notificaciones leídas
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  El historial aparecerá aquí cuando marques notificaciones como leídas
                </p>
              </div>
            )}

            {!loading && readNotifications.length > 0 && (
              <>
                {Object.entries(categorizedNotifications).map(([category, notifications]) => {
                  if (notifications.length === 0) return null;

                  return (
                    <div key={category}>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </h2>
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <NotificationCard
                            key={notification.id}
                            notification={notification}
                            onOpenRatingModal={handleOpenRatingModal}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Rating Modal */}
        {ratingModalData && (
          <UserRatingDialog
            open={showRatingModal}
            onOpenChange={setShowRatingModal}
            userToRate={{
              id: ratingModalData.userId,
              nickname: ratingModalData.nickname
            }}
            listingTitle={ratingModalData.listingTitle}
            listingId={ratingModalData.listingId}
            onSubmit={handleSubmitRating}
          />
        )}
      </div>
    </div>
  );
}

export default function NotificationsCenterPage() {
  return (
    <AuthGuard>
      <NotificationsCenterContent />
    </AuthGuard>
  );
}
