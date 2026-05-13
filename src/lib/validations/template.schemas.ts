import { z } from 'zod';

const baseTemplateSlotSchema = z.object({
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

const baseTemplatePageSchema = z.object({
  title: z.string(),
  type: z.enum(['team', 'special']),
  slots: z.array(baseTemplateSlotSchema),
});

const baseTemplateSchema = z.object({
  title: z.string(),
  description: z.string().optional().or(z.literal('')),
  image_url: z.string(),
  is_public: z.boolean().default(false),
  pages: z.array(baseTemplatePageSchema),
});

export type TemplateSlotData = z.infer<typeof baseTemplateSlotSchema>;
export type TemplatePageData = z.infer<typeof baseTemplatePageSchema>;
export type TemplateFormData = z.infer<typeof baseTemplateSchema>;

export const getTemplatePageSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(1, t('pageTitleRequired')).max(100, t('pageTitleMax')),
  type: z.enum(['team', 'special'], { message: t('pageTypeInvalid') }),
  slots: z.array(baseTemplateSlotSchema).min(1, t('slotsMin')).max(50, t('slotsMax')),
});

export const getTemplateSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(3, t('titleMin')).max(100, t('titleMax')),
  description: z.string().max(1000, t('descriptionMax')).optional().or(z.literal('')),
  image_url: z.string().min(1, t('imageRequired')).url(t('imageInvalid')),
  is_public: z.boolean().default(false),
  pages: z.array(getTemplatePageSchema(t)).min(1, t('pagesMin')).max(20, t('pagesMax')),
});

const baseTemplateBasicInfoSchema = baseTemplateSchema.pick({
  title: true,
  description: true,
  image_url: true,
  is_public: true,
});

export type TemplateBasicInfoData = z.infer<typeof baseTemplateBasicInfoSchema>;

export const getTemplateBasicInfoSchema = (t: (key: string) => string) => getTemplateSchema(t).pick({
  title: true,
  description: true,
  image_url: true,
  is_public: true,
});

const baseTemplateProgressSchema = z.object({
  slot_id: z.string().uuid(),
  status: z.enum(['missing', 'owned', 'duplicate']),
  count: z.number().int().min(0).max(999),
});

export type TemplateProgressData = z.infer<typeof baseTemplateProgressSchema>;

export const getTemplateProgressSchema = (t: (key: string) => string) => z.object({
  slot_id: z.string().uuid(t('slotInvalid')),
  status: z.enum(['missing', 'owned', 'duplicate'], { message: t('invalidStatus') }),
  count: z.number().int(t('countInt')).min(0, t('countMin')).max(999, t('countMax')),
});
