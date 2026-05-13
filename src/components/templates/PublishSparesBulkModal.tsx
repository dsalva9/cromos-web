'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SlotProgress } from '@/types/v1.6.0';
import { PackagePlus, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';

interface PublishSparesBulkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionTitle: string;
  spares: SlotProgress[];
  onPublish: (description: string) => Promise<void>;
}

export function PublishSparesBulkModal({
  open,
  onOpenChange,
  collectionTitle,
  spares,
  onPublish,
}: PublishSparesBulkModalProps) {
  const t = useTranslations('templates.publishSparesModal');
  const [isPublishing, setIsPublishing] = useState(false);
  const [customDescription, setCustomDescription] = useState('');

  // Generate auto description from spares
  const generateDescription = () => {
    if (spares.length === 0) return '';

    const lines = spares.map((spare) => {
      const parts: string[] = [];

      // Add label/name if available
      if (spare.label) {
        parts.push(spare.label);
      }

      // Add numbers
      if (spare.global_number) {
        parts.push(`#${spare.global_number}`);
      } else if (spare.slot_number) {
        const num = spare.slot_variant
          ? `${spare.slot_number}${spare.slot_variant}`
          : `${spare.slot_number}`;
        parts.push(`#${num}`);
      }

      // Add dynamic fields from data
      if (spare.data && Object.keys(spare.data).length > 0) {
        Object.entries(spare.data).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            parts.push(`${key}: ${value}`);
          }
        });
      }

      // Add count if more than 1
      if (spare.count > 1) {
        parts.push(`(x${spare.count})`);
      }

      return `• ${parts.join(' - ')}`;
    });

    return lines.join('\n');
  };

  const autoDescription = generateDescription();
  const finalDescription = customDescription || autoDescription;

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      await onPublish(finalDescription);
      onOpenChange(false);
      setCustomDescription('');
    } catch (error) {
      logger.error('Error publishing bulk listing:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white text-2xl flex items-center gap-3">
            <div className="bg-gold/10 p-2 rounded-lg">
              <PackagePlus className="w-6 h-6 text-gold" />
            </div>
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 pt-2">
            {t.rich('description', {
              collection: collectionTitle,
              strong: (chunks) => <span className="text-gray-900 dark:text-white font-semibold">{chunks}</span>
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Banner */}
          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 flex gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">{t('howItWorks')}</p>
              <p>
                {t('howItWorksDesc')}
              </p>
            </div>
          </div>

          {/* Spares Count */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              <span className="text-gold font-bold text-lg">
                {spares.length}
              </span>{' '}
              {t('sparesCount', { count: spares.length })}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              {t('totalUnits', { total: spares.reduce((sum, spare) => sum + spare.count, 0) })}
            </p>
          </div>

          {/* Description Preview/Edit */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-900 dark:text-white">
              {t('packDescription')}
            </Label>
            <Textarea
              id="description"
              value={customDescription || autoDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder={t('packDescriptionPlaceholder')}
              rows={12}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('packDescriptionHelp')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || spares.length === 0}
            className="bg-gold text-black hover:bg-gold-light font-bold"
          >
            {isPublishing ? t('publishing') : t('publishBtn', { count: spares.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
