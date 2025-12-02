/**
 * NotificationChannelTab Component
 * Displays all notification types for a single channel, grouped by category
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  NotificationChannel,
  GranularNotificationPreferences,
  NotificationCategory,
  NotificationKind,
} from '@/types/notifications';
import {
  getCategoryNotificationTypes,
  CATEGORY_INFO,
} from '@/lib/notifications/config';
import { NotificationTypeToggle } from './NotificationTypeToggle';
import { toggleNotificationPreference } from '@/lib/supabase/notification-preferences';

interface NotificationChannelTabProps {
  channel: NotificationChannel;
  preferences: GranularNotificationPreferences;
  onUpdate: (preferences: GranularNotificationPreferences) => void;
  disabled?: boolean;
}

const CATEGORIES: NotificationCategory[] = ['marketplace', 'templates', 'community', 'trades', 'system'];

export function NotificationChannelTab({
  channel,
  preferences,
  onUpdate,
  disabled = false,
}: NotificationChannelTabProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<NotificationCategory>>(
    new Set(CATEGORIES)
  );

  const toggleCategory = (category: NotificationCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggle = (kind: string, enabled: boolean) => {
    const updated = toggleNotificationPreference(
      preferences,
      kind as NotificationKind,
      channel,
      enabled
    );
    onUpdate(updated);
  };

  const toggleAllInCategory = (category: NotificationCategory, enabled: boolean) => {
    const types = getCategoryNotificationTypes(category);
    let updated = { ...preferences };

    types.forEach((config) => {
      updated = toggleNotificationPreference(
        updated,
        config.kind,
        channel,
        enabled
      );
    });

    onUpdate(updated);
  };

  const isCategoryAllEnabled = (category: NotificationCategory): boolean => {
    const types = getCategoryNotificationTypes(category);
    return types.every((config) => preferences[channel][config.kind]);
  };

  return (
    <div className="space-y-4">
      {CATEGORIES.map((category) => {
        const types = getCategoryNotificationTypes(category);
        if (types.length === 0) return null;

        const isExpanded = expandedCategories.has(category);
        const allEnabled = isCategoryAllEnabled(category);
        const categoryInfo = CATEGORY_INFO[category];

        return (
          <div
            key={category}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Category header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {categoryInfo.label}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {categoryInfo.description}
                    </p>
                  </div>
                </button>

                {/* Select all / Deselect all */}
                <button
                  onClick={() => toggleAllInCategory(category, !allEnabled)}
                  disabled={disabled}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {allEnabled ? 'Desactivar todas' : 'Activar todas'}
                </button>
              </div>
            </div>

            {/* Category notification types */}
            {isExpanded && (
              <div className="p-4 space-y-2 bg-gray-50 dark:bg-gray-900/30">
                {types.map((config) => (
                  <NotificationTypeToggle
                    key={config.kind}
                    config={config}
                    enabled={preferences[channel][config.kind]}
                    onChange={(enabled) => handleToggle(config.kind, enabled)}
                    disabled={disabled}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
