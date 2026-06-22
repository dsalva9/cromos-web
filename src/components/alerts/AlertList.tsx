'use client';

import { useTranslations } from 'next-intl';
import { BellPlus, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCard } from '@/components/alerts/AlertCard';
import { useAlerts } from '@/hooks/alerts/useAlerts';
import type { MarketplaceAlert } from '@/lib/supabase/alerts';

interface AlertListProps {
  onEdit: (alert: MarketplaceAlert) => void;
  onCreateNew: () => void;
}

export function AlertList({ onEdit, onCreateNew }: AlertListProps) {
  const t = useTranslations('alerts');
  const { alerts, loading, deleteAlert, toggleAlert } = useAlerts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={BellPlus}
        title={t('empty')}
        description={t('emptyDescription')}
        actionLabel={t('createTab')}
        onAction={onCreateNew}
      />
    );
  }

  // Show active alerts first, then paused
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-3">
      {sortedAlerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onEdit={onEdit}
          onDelete={deleteAlert}
          onToggle={toggleAlert}
        />
      ))}
    </div>
  );
}
