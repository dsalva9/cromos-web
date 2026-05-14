/**
 * NotificationTypeToggle Component
 * Single notification type toggle with label and description
 */

import type { NotificationTypeConfig } from '@/types/notifications';
import { useTranslations } from 'next-intl';

interface NotificationTypeToggleProps {
  config: NotificationTypeConfig;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function NotificationTypeToggle({
  config,
  enabled,
  onChange,
  disabled = false,
}: NotificationTypeToggleProps) {
  const t = useTranslations('settings.notifications.types');

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {/* Label and description */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">
            {t(`${config.kind}.label`)}
          </h4>
          <p className="text-xs text-gray-600 mt-0.5">
            {t(`${config.kind}.description`)}
          </p>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          onClick={() => onChange(!enabled)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
            enabled
              ? 'bg-blue-600'
              : 'bg-gray-200 dark:bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={`${enabled ? 'Desactivar' : 'Activar'} ${t(`${config.kind}.label`)}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
