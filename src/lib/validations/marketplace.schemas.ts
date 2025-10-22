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
    .url('La URL de la imagen no es válida')
    .optional()
    .or(z.literal('')),
});

/**
 * TypeScript type inferred from the listing schema
 */
export type ListingFormData = z.infer<typeof listingSchema>;

/**
 * Validation schema for listing status updates
 */
export const listingStatusSchema = z.object({
  status: z.enum(['active', 'sold', 'removed'], { message: 'Estado inválido' }),
});

export type ListingStatusData = z.infer<typeof listingStatusSchema>;
