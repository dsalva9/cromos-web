import { z } from 'zod';

/**
 * Validation schema for marketplace listing creation and editing
 */
export const listingSchema = z.object({
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no puede exceder 100 caracteres'),

  description: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .or(z.literal('')),

  sticker_number: z
    .string()
    .max(50, 'El número de cromo no puede exceder 50 caracteres')
    .optional()
    .or(z.literal('')),

  collection_name: z
    .string()
    .max(100, 'El nombre de la colección no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('')),

  image_url: z
    .string()
    .min(1, 'La imagen es obligatoria')
    .url('La URL de la imagen no es válida'),

  // New Panini-style fields - all optional
  // z.nan() handles empty number inputs with valueAsNumber: true
  page_number: z
    .number()
    .int()
    .positive()
    .optional()
    .or(z.nan().transform(() => undefined)),

  page_title: z
    .string()
    .max(100, 'El título de la página no puede exceder 100 caracteres')
    .optional()
    .or(z.literal('')),

  slot_variant: z
    .string()
    .max(10, 'La variante no puede exceder 10 caracteres')
    .optional()
    .or(z.literal('')),

  global_number: z
    .number()
    .int()
    .positive()
    .optional()
    .or(z.nan().transform(() => undefined)),

  // Listing type fields
  listing_type: z.enum(['intercambio', 'venta', 'ambos']),

  price: z
    .number()
    .positive('El precio debe ser mayor que 0')
    .max(99999, 'El precio no puede exceder 99.999 €')
    .optional(),

  terms_accepted: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Debes aceptar los términos de uso',
    }),
}).superRefine((data, ctx) => {
  // Price is required when listing includes sale
  if ((data.listing_type === 'venta' || data.listing_type === 'ambos') && (!data.price || data.price <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El precio es obligatorio cuando el anuncio incluye venta',
      path: ['price'],
    });
  }
});

/**
 * TypeScript type inferred from the listing schema
 */
export type ListingFormData = z.infer<typeof listingSchema>;

/**
 * Simplified schema for editing listings — only fields the user should change
 */
export const editListingSchema = z.object({
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no puede exceder 100 caracteres'),

  description: z
    .string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .or(z.literal('')),

  image_url: z
    .string()
    .min(1, 'La imagen es obligatoria')
    .url('La URL de la imagen no es válida'),

  listing_type: z.enum(['intercambio', 'venta', 'ambos']),

  price: z
    .number()
    .positive('El precio debe ser mayor que 0')
    .max(99999, 'El precio no puede exceder 99.999 €')
    .optional(),
}).superRefine((data, ctx) => {
  if ((data.listing_type === 'venta' || data.listing_type === 'ambos') && (!data.price || data.price <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El precio es obligatorio cuando el anuncio incluye venta',
      path: ['price'],
    });
  }
});

export type EditListingFormData = z.infer<typeof editListingSchema>;

/**
 * Validation schema for listing status updates
 */
export const listingStatusSchema = z.object({
  status: z.enum(['active', 'sold', 'removed'], { message: 'Estado inválido' }),
});

export type ListingStatusData = z.infer<typeof listingStatusSchema>;
