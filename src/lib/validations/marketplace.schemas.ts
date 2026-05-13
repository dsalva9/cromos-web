import { z } from 'zod';

const baseListingSchema = z.object({
  title: z.string(),
  description: z.string().optional().or(z.literal('')),
  sticker_number: z.string().optional().or(z.literal('')),
  collection_name: z.string().optional().or(z.literal('')),
  image_url: z.string(),
  page_number: z.number().int().positive().optional().or(z.nan().transform(() => undefined)),
  page_title: z.string().optional().or(z.literal('')),
  slot_variant: z.string().optional().or(z.literal('')),
  global_number: z.number().int().positive().optional().or(z.nan().transform(() => undefined)),
  listing_type: z.enum(['intercambio', 'venta', 'ambos']),
  price: z.number().optional(),
  terms_accepted: z.boolean(),
});

export type ListingFormData = z.infer<typeof baseListingSchema>;

export const getListingSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(3, t('titleMin')).max(100, t('titleMax')),
  description: z.string().max(1000, t('descriptionMax')).optional().or(z.literal('')),
  sticker_number: z.string().max(50, t('stickerMax')).optional().or(z.literal('')),
  collection_name: z.string().max(100, t('collectionMax')).optional().or(z.literal('')),
  image_url: z.string().min(1, t('imageRequired')).url(t('imageInvalid')),
  page_number: z.number().int().positive().optional().or(z.nan().transform(() => undefined)),
  page_title: z.string().max(100, t('pageTitleMax')).optional().or(z.literal('')),
  slot_variant: z.string().max(10, t('slotVariantMax')).optional().or(z.literal('')),
  global_number: z.number().int().positive().optional().or(z.nan().transform(() => undefined)),
  listing_type: z.enum(['intercambio', 'venta', 'ambos']),
  price: z.number().positive(t('pricePositive')).max(99999, t('priceMax')).optional(),
  terms_accepted: z.boolean().refine((val) => val === true, { message: t('termsRequired') }),
}).superRefine((data, ctx) => {
  if ((data.listing_type === 'venta' || data.listing_type === 'ambos') && (!data.price || data.price <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: t('priceRequired'),
      path: ['price'],
    });
  }
});

const baseEditListingSchema = z.object({
  title: z.string(),
  description: z.string().optional().or(z.literal('')),
  image_url: z.string(),
  listing_type: z.enum(['intercambio', 'venta', 'ambos']),
  price: z.number().optional(),
});

export type EditListingFormData = z.infer<typeof baseEditListingSchema>;

export const getEditListingSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(3, t('titleMin')).max(100, t('titleMax')),
  description: z.string().max(1000, t('descriptionMax')).optional().or(z.literal('')),
  image_url: z.string().min(1, t('imageRequired')).url(t('imageInvalid')),
  listing_type: z.enum(['intercambio', 'venta', 'ambos']),
  price: z.number().positive(t('pricePositive')).max(99999, t('priceMax')).optional(),
}).superRefine((data, ctx) => {
  if ((data.listing_type === 'venta' || data.listing_type === 'ambos') && (!data.price || data.price <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: t('priceRequired'),
      path: ['price'],
    });
  }
});

export const listingStatusSchema = z.object({
  status: z.enum(['active', 'sold', 'removed']),
});

export type ListingStatusData = z.infer<typeof listingStatusSchema>;
