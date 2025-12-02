/**
 * NotificationPreferencesTabs Component
 * Tabbed interface for configuring notification preferences across channels
 */

'use client';

import { useState } from 'react';
import { Bell, Smartphone, Mail, Save } from 'lucide-react';
import type {
  GranularNotificationPreferences,
  NotificationChannel,
} from '@/types/notifications';
import { CHANNEL_INFO } from '@/lib/notifications/config';
import { NotificationChannelTab } from './NotificationChannelTab';

interface NotificationPreferencesTabsProps {
  preferences: GranularNotificationPreferences;
  onSave: (preferences: GranularNotificationPreferences) => Promise<void>;
  saving: boolean;
}

const CHANNELS: { id: NotificationChannel; icon: typeof Bell }[] = [
  { id: 'in_app', icon: Bell },
  { id: 'push', icon: Smartphone },
  { id: 'email', icon: Mail },
];

export function NotificationPreferencesTabs({
  preferences,
  onSave,
  saving,
}: NotificationPreferencesTabsProps) {
  const [activeTab, setActiveTab] = useState<NotificationChannel>('in_app');
  const [localPreferences, setLocalPreferences] = useState<GranularNotificationPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  const handleUpdate = (updated: GranularNotificationPreferences) => {
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(localPreferences);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px space-x-8" aria-label="Tabs">
          {CHANNELS.map(({ id, icon: Icon }) => {
            const channelInfo = CHANNEL_INFO[id];
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${
                      isActive
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }
                  `}
                />
                {channelInfo.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Channel description */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {CHANNEL_INFO[activeTab].description}
        </p>
      </div>

      {/* Tab content */}
      <NotificationChannelTab
        channel={activeTab}
        preferences={localPreferences}
        onUpdate={handleUpdate}
        disabled={saving}
      />

      {/* Save/Reset buttons */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}
