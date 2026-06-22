'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CollectionFilter } from '@/components/marketplace/CollectionFilter';
import { BellRing, Zap, Calendar, CalendarDays, Loader2, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceAlert, CreateAlertParams } from '@/lib/supabase/alerts';

interface AlertFormProps {
  initialData?: MarketplaceAlert | null;
  prefill?: {
    search?: string;
    collectionId?: number;
    templateId?: number;
    templateName?: string;
    slotNumber?: number;
    slotVariant?: string;
  };
  onSubmit: (params: CreateAlertParams) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const FREQUENCIES = [
  { value: 'instant' as const, icon: Zap, labelKey: 'frequencyInstant' },
  { value: 'daily' as const, icon: CalendarDays, labelKey: 'frequencyDaily' },
  { value: 'weekly' as const, icon: Calendar, labelKey: 'frequencyWeekly' },
] as const;

export function AlertForm({
  initialData,
  prefill,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AlertFormProps) {
  const t = useTranslations('alerts');

  // Form state
  const [searchQuery, setSearchQuery] = useState(
    initialData?.search_query ?? prefill?.search ?? ''
  );
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>(
    initialData?.collection_id
      ? [initialData.collection_id]
      : prefill?.collectionId
        ? [prefill.collectionId]
        : []
  );
  const [templateId] = useState<number | null>(
    initialData?.template_id ?? prefill?.templateId ?? null
  );
  const [slotNumber] = useState<number | null>(
    initialData?.slot_number ?? prefill?.slotNumber ?? null
  );
  const [slotVariant] = useState<string | null>(
    initialData?.slot_variant ?? prefill?.slotVariant ?? null
  );
  const [templateName] = useState<string | null>(
    initialData?.template_name ?? prefill?.templateName ?? null
  );
  const [frequency, setFrequency] = useState<'instant' | 'daily' | 'weekly'>(
    initialData?.frequency ?? 'weekly'
  );
  const [channelEmail, setChannelEmail] = useState(initialData?.channel_email ?? true);
  const [channelPush, setChannelPush] = useState(initialData?.channel_push ?? false);
  const [channelInApp, setChannelInApp] = useState(initialData?.channel_in_app ?? true);

  // Validation
  const hasSearchCriteria =
    searchQuery.trim().length > 0 ||
    selectedCollectionIds.length > 0 ||
    (templateId != null && slotNumber != null);
  const hasChannel = channelEmail || channelPush || channelInApp;
  const isValid = hasSearchCriteria && hasChannel;

  // Reset form when initialData or prefill changes
  useEffect(() => {
    if (initialData) {
      setSearchQuery(initialData.search_query ?? '');
      setSelectedCollectionIds(initialData.collection_id ? [initialData.collection_id] : []);
      setFrequency(initialData.frequency);
      setChannelEmail(initialData.channel_email);
      setChannelPush(initialData.channel_push);
      setChannelInApp(initialData.channel_in_app);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    await onSubmit({
      p_search_query: searchQuery.trim() || null,
      p_collection_id: selectedCollectionIds[0] ?? null,
      p_template_id: templateId,
      p_slot_number: slotNumber,
      p_slot_variant: slotVariant,
      p_frequency: frequency,
      p_channel_email: channelEmail,
      p_channel_push: channelPush,
      p_channel_in_app: channelInApp,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sticker info (read-only when coming from album) */}
      {templateId != null && slotNumber != null && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gold">
            <Hash className="w-4 h-4" />
            <span>
              {t('stickerAlert', {
                number: slotNumber,
                variant: slotVariant || '',
                album: templateName || `#${templateId}`,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Search query */}
      <div className="space-y-2">
        <Label htmlFor="alert-search" className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('searchLabel')}
        </Label>
        <Input
          id="alert-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="bg-white dark:bg-gray-900"
        />
      </div>

      {/* Collection filter */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('collectionLabel')}
        </Label>
        <CollectionFilter
          selectedCollectionIds={selectedCollectionIds}
          onSelectionChange={setSelectedCollectionIds}
        />
      </div>

      {/* Frequency selector */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('frequencyLabel')}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {FREQUENCIES.map(({ value, icon: Icon, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFrequency(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-bold transition-all',
                frequency === value
                  ? 'border-gold bg-gold/10 text-gold shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Channel selector */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('channelsLabel')}
        </Label>
        <div className="space-y-2">
          {[
            { id: 'email', label: t('channelEmail'), checked: channelEmail, onChange: setChannelEmail },
            { id: 'push', label: t('channelPush'), checked: channelPush, onChange: setChannelPush },
            { id: 'inapp', label: t('channelInApp'), checked: channelInApp, onChange: setChannelInApp },
          ].map(({ id, label, checked, onChange }) => (
            <div key={id} className="flex items-center gap-2">
              <Checkbox
                id={`channel-${id}`}
                checked={checked}
                onCheckedChange={(v) => onChange(v === true)}
                className="data-[state=checked]:bg-gold data-[state=checked]:border-gold"
              />
              <Label htmlFor={`channel-${id}`} className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>
        {!hasChannel && (
          <p className="text-xs text-red-500">{t('channelRequired')}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="flex-1 bg-gold hover:bg-gold/90 text-black font-bold"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <BellRing className="w-4 h-4 mr-2" />
          )}
          {initialData ? t('updateButton') : t('createButton')}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancelButton')}
          </Button>
        )}
      </div>
    </form>
  );
}
