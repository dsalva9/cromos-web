'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export function ThemeSettingsSection() {
  const t = useTranslations('settings');
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options = [
    { value: 'light' as const, label: t('theme.light'), icon: Sun },
    { value: 'dark' as const, label: t('theme.dark'), icon: Moon },
    { value: 'system' as const, label: t('theme.system'), icon: Monitor },
  ];

  return (
    <ModernCard>
      <ModernCardContent className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Tema de la aplicación
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Selecciona el tema que prefieres para la interfaz
          {theme === 'system' && ` (Actualmente: ${resolvedTheme === 'dark' ? 'oscuro' : 'claro'})`}
        </p>

        <div className="grid grid-cols-3 gap-3">
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                theme === value
                  ? 'border-gold bg-gold/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <Icon className={cn(
                'h-6 w-6',
                theme === value ? 'text-gold' : 'text-gray-600 dark:text-gray-400'
              )} />
              <span className={cn(
                'text-sm font-medium',
                theme === value ? 'text-gold' : 'text-gray-900 dark:text-white'
              )}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
