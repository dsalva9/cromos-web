'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, EyeOff, FileText } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface TemplateSlotData {
  data: Record<string, string | number | boolean>;
}

interface TemplatePageData {
  title: string;
  type: 'team' | 'special';
  slots: TemplateSlotData[];
}

interface TemplateReviewFormProps {
  data: {
    title: string;
    description: string;
    image_url: string;
    is_public: boolean;
    pages: TemplatePageData[];
    terms_accepted?: boolean;
  };
  onChange: (
    data: Partial<{
      title: string;
      description: string;
      image_url: string;
      is_public: boolean;
      pages: TemplatePageData[];
      terms_accepted?: boolean;
    }>
  ) => void;
}

export function TemplateReviewForm({
  data,
  onChange,
}: TemplateReviewFormProps) {
  const t = useTranslations('templates.reviewForm');
  const [isEditing, setIsEditing] = useState({
    title: false,
    description: false,
    is_public: false,
  });
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

  const toggleEdit = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const totalSlots = data.pages.reduce(
    (sum, page) => sum + page.slots.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Basic Info Review */}
      <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
            {t('basicInfo')}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleEdit('title')}
              className="text-gold hover:text-gold-light"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-gray-900 dark:text-white">{t('title')}</Label>
            {isEditing.title ? (
              <Input
                value={data.title}
                onChange={e => onChange({ title: e.target.value })}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{data.title || t('noTitle')}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-gray-900 dark:text-white">{t('description')}</Label>
            {isEditing.description ? (
              <Textarea
                value={data.description}
                onChange={e => onChange({ description: e.target.value })}
                rows={3}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white resize-none"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">
                {data.description || t('noDescription')}
              </p>
            )}
          </div>

          {/* Image */}
          {data.image_url && (
            <div className="space-y-2">
              <Label className="text-gray-900 dark:text-white">{t('image')}</Label>
              <div className="relative min-h-[250px] max-h-[500px] w-full bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden flex items-center justify-center">
                <Image
                  src={data.image_url}
                  alt="Template preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-contain rounded-md"
                />
              </div>
            </div>
          )}

          {/* Public/Private */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-gray-900 dark:text-white">{t('visibility')}</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {data.is_public
                  ? t('publicStatus')
                  : t('privateStatus')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={data.is_public}
                onCheckedChange={checked => onChange({ is_public: checked })}
              />
              <span className="text-gray-900 dark:text-white">
                {data.is_public ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages and Slots Summary */}
      <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            {t('summary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gold">
                {data.pages.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('pagesLabel')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gold">
                {totalSlots}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('totalStickers')}</div>
            </div>
          </div>

          {/* Pages List */}
          <div className="space-y-3">
            {data.pages.map((page, pageIndex) => (
              <Card key={pageIndex} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900 dark:text-white">{page.title}</h4>
                    <Badge
                      variant={page.type === 'team' ? 'default' : 'secondary'}
                    >
                      {page.type === 'team' ? t('normal') : t('special')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FileText className="h-4 w-4" />
                    <span>{t('stickersCount', { count: page.slots.length })}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('customFieldsCount', { count: page.slots.length })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terms of Use for Public Templates */}
      {data.is_public && (
        <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">{t('termsOfUse')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="template-terms"
                checked={data.terms_accepted || false}
                onCheckedChange={(checked) =>
                  onChange({ terms_accepted: checked === true })
                }
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor="template-terms"
                  className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                >
                  {t.rich('termsCheckbox', {
                    strong: (chunks) => <strong>{chunks}</strong>
                  })}{' '}
                  <button
                    type="button"
                    onClick={() => setTermsDialogOpen(true)}
                    className="text-gold hover:text-gold-light underline"
                  >
                    {t('viewConditions')}
                  </button>
                  <span className="text-red-500 ml-1">*</span>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Confirmation */}
      <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">{t('finalConfirmation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-gray-900 dark:text-white">
              {t('aboutToCreate')}
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>{t('pagesCount', { count: data.pages.length })}</li>
              <li>{t('stickersTotal', { count: totalSlots })}</li>
              <li>{data.is_public ? t('visibilityPublic') : t('visibilityPrivate')}</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              {t('availabilityDesc')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Terms Dialog */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('termsDialogTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <p>
              {t('termsDialogText')}
            </p>
            <div className="pt-4">
              <Button
                onClick={() => setTermsDialogOpen(false)}
                className="w-full bg-gold text-black hover:bg-gold-light"
              >
                {t('close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
