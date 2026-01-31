'use client';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LucideIcon, X } from 'lucide-react';
import { Button } from './button';

interface ContextualTipProps {
  tipId: string;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function ContextualTip({
  tipId,
  icon: Icon,
  title,
  description,
  className = '',
}: ContextualTipProps) {
  const [dismissedTips, setDismissedTips] = useLocalStorage<string[]>('dismissed-tips', []);

  // Don't render if tip has been dismissed
  if (dismissedTips.includes(tipId)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedTips([...dismissedTips, tipId]);
  };

  return (
    <div
      className={`bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 ${className}`}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">
            {title}
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {description}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar consejo</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
