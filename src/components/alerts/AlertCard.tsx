'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Search, Target, Zap, Calendar, CalendarDays,
  Mail, Bell, Smartphone, Pencil, Trash2, Pause, Play,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceAlert } from '@/lib/supabase/alerts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AlertCardProps {
  alert: MarketplaceAlert;
  onEdit: (alert: MarketplaceAlert) => void;
  onDelete: (alertId: number) => Promise<void>;
  onToggle: (alertId: number) => Promise<void> | Promise<boolean>;
}

const frequencyConfig = {
  instant: { icon: Zap, labelKey: 'frequencyInstant' as const, color: 'text-amber-500' },
  daily: { icon: CalendarDays, labelKey: 'frequencyDaily' as const, color: 'text-blue-500' },
  weekly: { icon: Calendar, labelKey: 'frequencyWeekly' as const, color: 'text-purple-500' },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)}sem`;
  return `hace ${Math.floor(diffDays / 30)}mes`;
}

export function AlertCard({ alert, onEdit, onDelete, onToggle }: AlertCardProps) {
  const t = useTranslations('alerts');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const freq = frequencyConfig[alert.frequency];
  const FreqIcon = freq.icon;

  // Build description text
  const isSpecificSticker = alert.template_id != null && alert.slot_number != null;
  const AlertIcon = isSpecificSticker ? Target : Search;

  let primaryText = '';
  if (alert.search_query) {
    primaryText = `"${alert.search_query}"`;
  }
  if (isSpecificSticker) {
    primaryText = `#${alert.slot_number}${alert.slot_variant || ''}`;
    if (alert.template_name) {
      primaryText += ` · ${alert.template_name}`;
    }
  }
  if (!primaryText && alert.collection_name) {
    primaryText = alert.collection_name;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(alert.id);
    } catch (error) {
      // Caught to prevent unhandled promise rejection.
      // Toast notification is already handled by useAlerts' onError callback.
      console.error('Failed to delete alert:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(alert.id);
    } catch (error) {
      // Caught to prevent unhandled promise rejection.
      // Toast notification is already handled by useAlerts' onError callback.
      console.error('Failed to toggle alert:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-200',
        alert.is_active
          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md'
          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 opacity-60'
      )}
    >
      {/* Paused badge */}
      {!alert.is_active && (
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
            {t('pausedBadge')}
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
          alert.is_active
            ? 'bg-gold/10 text-gold'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
        )}>
          <AlertIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Primary text */}
          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
            {primaryText || t('allListings')}
          </p>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {/* Collection badge */}
            {alert.collection_name && !isSpecificSticker && (
              <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                {alert.collection_name}
              </span>
            )}

            {/* Frequency badge */}
            <span className={cn('flex items-center gap-1 text-[10px] font-bold', freq.color)}>
              <FreqIcon className="w-3 h-3" />
              {t(freq.labelKey)}
            </span>

            {/* Channel indicators */}
            <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
              {alert.channel_email && <span title={t('channelEmail')}><Mail className="w-3 h-3" /></span>}
              {alert.channel_push && <span title={t('channelPush')}><Smartphone className="w-3 h-3" /></span>}
              {alert.channel_in_app && <span title={t('channelInApp')}><Bell className="w-3 h-3" /></span>}
            </div>

            {/* Time */}
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {formatRelativeTime(alert.created_at)}
            </span>

            {/* Match count */}
            {alert.total_matches > 0 && (
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                {t('matchesCount', { count: alert.total_matches })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(alert)}
          className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <Pencil className="w-3 h-3" />
          <span className="hidden sm:inline ml-1">{t('editButton')}</span>
        </Button>
 
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          disabled={isToggling}
          className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          {isToggling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : alert.is_active ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          <span className="hidden sm:inline ml-1">
            {alert.is_active ? t('pauseButton') : t('resumeButton')}
          </span>
        </Button>
 
        <div className="flex-1" />
 
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              <span className="hidden sm:inline ml-1">{t('deleteButton')}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {t('deleteButton')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
