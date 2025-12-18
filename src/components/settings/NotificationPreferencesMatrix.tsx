/**
 * NotificationPreferencesMatrix Component
 * Matrix/table view for notification preferences
 * Rows: Notification types (grouped by category)
 * Columns: Channels (In-app, Push, Email)
 */

'use client';

import React, { useState } from 'react';
import { Bell, Smartphone, Mail, RotateCcw, Save, CheckSquare, Square } from 'lucide-react';
import type {
  GranularNotificationPreferences,
  NotificationChannel,
  NotificationCategory,
  NotificationKind,
} from '@/types/notifications';
import {
  NOTIFICATION_TYPE_CONFIGS,
  CATEGORY_INFO,
  getDefaultPreferences,
  isHiddenNotificationType,
} from '@/lib/notifications/config';
import { toggleNotificationPreference } from '@/lib/supabase/notification-preferences';

interface NotificationPreferencesMatrixProps {
  preferences: GranularNotificationPreferences;
  onSave: (preferences: GranularNotificationPreferences) => Promise<void>;
  saving: boolean;
}

const CHANNELS: { id: NotificationChannel; label: string; icon: typeof Bell; color: string }[] = [
  { id: 'in_app', label: 'En la App', icon: Bell, color: 'blue' },
  { id: 'push', label: 'Push', icon: Smartphone, color: 'purple' },
  { id: 'email', label: 'Email', icon: Mail, color: 'orange' },
];

const ACTIVE_CATEGORIES: NotificationCategory[] = ['marketplace', 'community'];

export function NotificationPreferencesMatrix({
  preferences,
  onSave,
  saving,
}: NotificationPreferencesMatrixProps) {
  const [localPreferences, setLocalPreferences] = useState<GranularNotificationPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (kind: string, channel: NotificationChannel) => {
    const currentValue = localPreferences[channel][kind as keyof typeof localPreferences.in_app];
    const updated = toggleNotificationPreference(
      localPreferences,
      kind as NotificationKind,
      channel,
      !currentValue
    );
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(localPreferences);
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaults = getDefaultPreferences();
    setLocalPreferences(defaults);
    setHasChanges(true);
  };

  const handleCancel = () => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  };

  const handleToggleAllChannel = (channel: NotificationChannel, enabled: boolean) => {
    const updated = { ...localPreferences };
    visibleTypes.forEach((config) => {
      updated[channel][config.kind] = enabled;
    });
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const isChannelAllEnabled = (channel: NotificationChannel): boolean => {
    return visibleTypes.every((config) => localPreferences[channel][config.kind]);
  };

  // Get visible notification types (exclude hidden, legacy, and not-yet-implemented)
  const visibleTypes = NOTIFICATION_TYPE_CONFIGS.filter(
    (config) => !isHiddenNotificationType(config.kind) && config.kind !== 'level_up'
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          onClick={handleReset}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar valores por defecto
        </button>

        {hasChanges && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-center"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Matrix table - Desktop */}
      <div className="hidden sm:block overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                Tipo de Notificación
              </th>
              {CHANNELS.map(({ id, label, icon: Icon, color }) => {
                const allEnabled = isChannelAllEnabled(id);
                return (
                  <th
                    key={id}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
                        {label}
                      </div>
                      <button
                        onClick={() => handleToggleAllChannel(id, !allEnabled)}
                        disabled={saving}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-50 flex items-center gap-1"
                      >
                        {allEnabled ? (
                          <>
                            <CheckSquare className="w-3 h-3" />
                            Desmarcar todas
                          </>
                        ) : (
                          <>
                            <Square className="w-3 h-3" />
                            Marcar todas
                          </>
                        )}
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ACTIVE_CATEGORIES.map((category) => {
              const types = visibleTypes.filter((t) => t.category === category);
              if (types.length === 0) return null;

              return (
                <React.Fragment key={category}>
                  {/* Category header row */}
                  <tr className="bg-gray-100">
                    <td
                      colSpan={4}
                      className="px-6 py-3 text-sm font-semibold text-gray-900"
                    >
                      {CATEGORY_INFO[category].label}
                    </td>
                  </tr>

                  {/* Notification type rows */}
                  {types.map((config) => (
                    <tr
                      key={config.kind}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Notification label */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {config.label}
                            </span>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {config.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Channel toggles */}
                      {CHANNELS.map(({ id: channel }) => (
                        <td key={channel} className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle(config.kind, channel)}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              localPreferences[channel][config.kind]
                                ? 'bg-blue-600'
                                : 'bg-gray-200'
                            } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            aria-label={`${
                              localPreferences[channel][config.kind] ? 'Desactivar' : 'Activar'
                            } ${config.label} para ${channel}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                localPreferences[channel][config.kind]
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile view - Card layout */}
      <div className="sm:hidden space-y-4">
        {ACTIVE_CATEGORIES.map((category) => {
          const types = visibleTypes.filter((t) => t.category === category);
          if (types.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              {/* Category header */}
              <h3 className="text-sm font-semibold text-gray-900 px-2">
                {CATEGORY_INFO[category].label}
              </h3>

              {/* Notification cards */}
              {types.map((config) => (
                <div
                  key={config.kind}
                  className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  {/* Notification title */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {config.label}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {config.description}
                    </p>
                  </div>

                  {/* Channel toggles */}
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {CHANNELS.map(({ id: channel, label, icon: Icon }) => (
                      <div key={channel} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {label}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(config.kind, channel)}
                          disabled={saving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            localPreferences[channel][config.kind]
                              ? 'bg-blue-600'
                              : 'bg-gray-200'
                          } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          aria-label={`${
                            localPreferences[channel][config.kind] ? 'Desactivar' : 'Activar'
                          } ${config.label} para ${channel}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              localPreferences[channel][config.kind]
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

    </div>
  );
}
