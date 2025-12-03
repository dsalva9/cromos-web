'use client';

import { useState, useEffect } from 'react';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '@/lib/supabase/notification-preferences';
import type { GranularNotificationPreferences } from '@/types/notifications';
import { NotificationPreferencesMatrix } from '@/components/settings/NotificationPreferencesMatrix';
import { logger } from '@/lib/logger';

export function NotificationSettingsTab() {
  const [preferences, setPreferences] = useState<GranularNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await fetchNotificationPreferences();
      setPreferences(prefs);
    } catch (error) {
      logger.error('[NotificationSettingsTab] Error loading preferences:', error);
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
      logger.error('[NotificationSettingsTab] Error saving preferences:', error);
      setMessage({
        type: 'error',
        text: 'Error al guardar las preferencias',
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (loading || !preferences) {
    return (
      <div className="animate-pulse">
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
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
  );
}
