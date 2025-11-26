'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseProvider';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/supabase/notification-preferences';
import { logger } from '@/lib/logger';
import { Bell, Mail, Smartphone } from 'lucide-react';

export default function AjustesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    email_enabled: true,
  });
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

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };

    setPreferences(newPreferences);

    try {
      setSaving(true);
      await updateNotificationPreferences(newPreferences);
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

      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Ajustes de Notificaciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configura cómo quieres recibir las notificaciones
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

        {/* Notification Settings */}
        <div className="space-y-4">
          {/* In-App Notifications (Always Enabled) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notificaciones en la App
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Siempre activas para no perderte nada
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Activo
                </span>
              </div>
            </div>
          </div>

          {/* Push Notifications Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notificaciones Push
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Recibe alertas en tu dispositivo
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('push_enabled')}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  preferences.push_enabled
                    ? 'bg-purple-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.push_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Email Notifications Toggle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Mail className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notificaciones por Email
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Recibe resúmenes en tu correo
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('email_enabled')}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  preferences.email_enabled
                    ? 'bg-orange-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.email_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Las notificaciones en la app siempre están activas para que no te pierdas ninguna actualización importante. Puedes desactivar las notificaciones push y por email si lo prefieres.
          </p>
        </div>
      </div>
    </div>
  );
}
