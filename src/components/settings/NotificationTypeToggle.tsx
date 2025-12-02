/**
 * NotificationTypeToggle Component
 * Single notification type toggle with label and description
 */

import type { NotificationTypeConfig } from '@/types/notifications';

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
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {/* Label and description */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {config.label}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {config.description}
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
          aria-label={`${enabled ? 'Desactivar' : 'Activar'} ${config.label}`}
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
