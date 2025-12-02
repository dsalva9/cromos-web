'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseProvider';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/supabase/notification-preferences';
import type { GranularNotificationPreferences } from '@/types/notifications';
import { NotificationPreferencesMatrix } from '@/components/settings/NotificationPreferencesMatrix';
import { logger } from '@/lib/logger';

export default function AjustesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [preferences, setPreferences] = useState<GranularNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load preferences on mount
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadPreferences();
  }, [user, router]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await fetchNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      logger.error('[Ajustes] Error loading preferences:', error);
      setMessage({
        type: 'error',
        text: 'Error al cargar las preferencias',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newPreferences: GranularNotificationPreferences) => {
    try {
      setSaving(true);
      await updateNotificationPreferences(newPreferences);
      setPreferences(newPreferences);
      setMessage({
        type: 'success',
        text: 'Preferencias actualizadas correctamente',
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      logger.error('[Ajustes] Error saving preferences:', error);
      setMessage({
        type: 'error',
        text: 'Error al guardar las preferencias',
      });
      throw error; // Re-throw so the component knows save failed
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Ajustes de Notificaciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configura qué notificaciones quieres recibir en cada canal
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Granular Preferences Matrix */}
        <NotificationPreferencesMatrix
          preferences={preferences}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
}
