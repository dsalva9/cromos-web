'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AuthGuard from '@/components/AuthGuard';
import { BellRing, Plus, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertForm } from '@/components/alerts/AlertForm';
import { AlertList } from '@/components/alerts/AlertList';
import { useAlerts } from '@/hooks/alerts/useAlerts';
import type { MarketplaceAlert, CreateAlertParams, UpdateAlertParams } from '@/lib/supabase/alerts';

function AlertasContent() {
  const t = useTranslations('alerts');
  const searchParams = useSearchParams();
  const { createAlert, updateAlert } = useAlerts();

  // URL pre-fill from marketplace or album sticker
  const prefill = useMemo(() => {
    const search = searchParams.get('search') || undefined;
    const collectionId = searchParams.get('collection')
      ? Number(searchParams.get('collection'))
      : undefined;
    const templateId = searchParams.get('template')
      ? Number(searchParams.get('template'))
      : undefined;
    const templateName = searchParams.get('templateName') || undefined;
    const slotNumber = searchParams.get('slot')
      ? Number(searchParams.get('slot'))
      : undefined;
    const slotVariant = searchParams.get('variant') || undefined;

    const hasPrefill = search || collectionId || templateId;
    return hasPrefill ? { search, collectionId, templateId, templateName, slotNumber, slotVariant } : undefined;
  }, [searchParams]);

  // Tab state — auto-select "create" when pre-fill params are present
  const [activeTab, setActiveTab] = useState<string>(prefill ? 'create' : 'manage');

  // Editing state
  const [editingAlert, setEditingAlert] = useState<MarketplaceAlert | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = useCallback((alert: MarketplaceAlert) => {
    setEditingAlert(alert);
    setActiveTab('create');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingAlert(null);
  }, []);

  const handleSubmit = useCallback(async (params: CreateAlertParams) => {
    setIsSubmitting(true);
    try {
      if (editingAlert) {
        // Update existing alert
        const updateParams: UpdateAlertParams = {
          ...params,
          p_alert_id: editingAlert.id,
        };
        await updateAlert(updateParams);
        setEditingAlert(null);
      } else {
        // Create new alert
        await createAlert(params);
      }
      // Switch to manage tab after success
      setActiveTab('manage');
    } catch (error) {
      // Caught to prevent unhandled promise rejection.
      // Toast notification is already handled by useAlerts' onError callback.
      console.error('Failed to save alert:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingAlert, createAlert, updateAlert]);

  const handleCreateNew = useCallback(() => {
    setEditingAlert(null);
    setActiveTab('create');
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
          <BellRing className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="create" className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            {editingAlert ? t('editTab') : t('createTab')}
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-1.5">
            <List className="w-4 h-4" />
            {t('manageTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-0">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <AlertForm
              key={editingAlert?.id ?? 'new'}
              initialData={editingAlert}
              prefill={editingAlert ? undefined : prefill}
              onSubmit={handleSubmit}
              onCancel={editingAlert ? handleCancelEdit : undefined}
              isSubmitting={isSubmitting}
            />
          </div>
        </TabsContent>

        <TabsContent value="manage" className="mt-0">
          <AlertList
            onEdit={handleEdit}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AlertasPage() {
  return (
    <AuthGuard>
      <AlertasContent />
    </AuthGuard>
  );
}
