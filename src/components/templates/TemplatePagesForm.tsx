'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { ItemFieldDefinition } from '@/types/v1.6.0';
import { DynamicFieldsEditor } from './DynamicFieldsEditor';
import { useTranslations } from 'next-intl';

interface TemplateSlotData {
  data: Record<string, string | number | boolean>;
}

interface TemplatePageData {
  title: string;
  type: 'team' | 'special';
  slots: TemplateSlotData[];
}

interface TemplatePagesFormProps {
  data: {
    pages: TemplatePageData[];
  };
  onChange: (data: { pages: TemplatePageData[] }) => void;
  itemSchema?: ItemFieldDefinition[];
}

export function TemplatePagesForm({ data, onChange, itemSchema }: TemplatePagesFormProps) {
  const t = useTranslations('templates.wizard.pagesForm');
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageType, setNewPageType] = useState<'team' | 'special'>('team');


  const addPage = () => {
    if (!newPageTitle.trim()) return;

    const newPage: TemplatePageData = {
      title: newPageTitle,
      type: newPageType,
      slots: [{
        data: {},
      }],
    };

    onChange({
      pages: [...data.pages, newPage],
    });

    setNewPageTitle('');
    setNewPageType('team');
  };

  const updatePage = (index: number, page: TemplatePageData) => {
    const updatedPages = [...data.pages];
    updatedPages[index] = page;
    onChange({ pages: updatedPages });
  };

  const deletePage = (index: number) => {
    const updatedPages = data.pages.filter((_, i) => i !== index);
    onChange({ pages: updatedPages });
  };

  const addSlot = (pageIndex: number) => {
    const updatedPages = [...data.pages];
    updatedPages[pageIndex].slots.push({
      data: {},
    });
    onChange({ pages: updatedPages });
  };

  const updateSlot = (
    pageIndex: number,
    slotIndex: number,
    slot: TemplateSlotData
  ) => {
    const updatedPages = [...data.pages];
    updatedPages[pageIndex].slots[slotIndex] = slot;
    onChange({ pages: updatedPages });
  };

  const deleteSlot = (pageIndex: number, slotIndex: number) => {
    const updatedPages = [...data.pages];
    updatedPages[pageIndex].slots = updatedPages[pageIndex].slots.filter(
      (_, i) => i !== slotIndex
    );
    onChange({ pages: updatedPages });
  };

  return (
    <div className="space-y-6">
        {/* Add New Page */}
        <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">{t('addNewPage')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-900 dark:text-white">{t('pageTitle')}</Label>
              <Input
                id="new-page-title"
                value={newPageTitle}
                onChange={e => setNewPageTitle(e.target.value)}
                placeholder={t('pageTitlePlaceholder')}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('pageType')}</Label>
              <RadioGroup
                value={newPageType}
                onValueChange={value =>
                  setNewPageType(value as 'team' | 'special')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="text-gray-900 dark:text-white">
                    {t('typeTeam')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="special" id="special" />
                  <Label htmlFor="special" className="text-gray-900 dark:text-white">
                    {t('typeSpecial')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <Button
            onClick={addPage}
            disabled={!newPageTitle.trim()}
            className="bg-gold text-black hover:bg-gold-light"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('addPageBtn')}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Pages */}
      {data.pages.map((page, pageIndex) => (
        <Card key={pageIndex} className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between group">
            <div className="flex items-center gap-2">
              <GripVertical className="h-6 w-6 text-slate-400 hover:text-yellow-400 hover:cursor-grab active:cursor-grabbing transition-colors duration-200" />
              <div>
                <CardTitle className="text-gray-900 dark:text-white">{page.title}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('stickersCount', { count: page.slots.length })} · (
                  {page.type === 'team' ? t('typeTeam') : t('typeSpecial')})
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deletePage(pageIndex)}
              className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Page Title and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`page-title-${pageIndex}`} className="text-gray-900 dark:text-white">
                  {t('pageTitle')}
                </Label>
                <Input
                  id={`page-title-${pageIndex}`}
                  value={page.title}
                  onChange={e =>
                    updatePage(pageIndex, { ...page, title: e.target.value })
                  }
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('pageType')}</Label>
                <RadioGroup
                  value={page.type}
                  onValueChange={value =>
                    updatePage(pageIndex, {
                      ...page,
                      type: value as 'team' | 'special',
                    })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="team" id={`team-${pageIndex}`} />
                    <Label htmlFor={`team-${pageIndex}`} className="text-gray-900 dark:text-white">
                      {t('typeTeam')}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="special" id={`special-${pageIndex}`} />
                    <Label htmlFor={`special-${pageIndex}`} className="text-gray-900 dark:text-white">
                      {t('typeSpecial')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('pageStickers')}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addSlot(pageIndex)}
                  className="text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addStickerBtn')}
                </Button>
              </div>

              <div className="space-y-4">
                {page.slots.map((slot, slotIndex) => (
                  <div
                    key={slotIndex}
                    className="group hover:bg-gray-100/30 dark:hover:bg-gray-800/30 rounded p-3 transition-all duration-200 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-slate-400 group-hover:text-yellow-400 hover:cursor-grab active:cursor-grabbing transition-colors duration-200" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {t('stickerNumber', { number: slotIndex + 1 })}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSlot(pageIndex, slotIndex)}
                        className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Dynamic Fields */}
                    {itemSchema && itemSchema.length > 0 ? (
                      <DynamicFieldsEditor
                        schema={itemSchema}
                        data={slot.data || {}}
                        onChange={(data) => updateSlot(pageIndex, slotIndex, { ...slot, data })}
                        idPrefix={`slot-${pageIndex}-${slotIndex}`}
                      />
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                        {t('noFieldsDefined')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Empty State */}
      {data.pages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            {t('noPages')}
          </p>
        </div>
      )}
    </div>
  );
}
