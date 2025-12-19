import { z } from 'zod';

/**
 * Validation schema for template slot data (dynamic fields)
 */
export const templateSlotSchema = z.object({
  data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * Validation schema for template page data
 */
export const templatePageSchema = z.object({
  title: z
    .string()
    .min(1, 'El título de la página es obligatorio')
    .max(100, 'El título no puede exceder 100 caracteres'),

  type: z.enum(['team', 'special'], { message: 'Tipo de página inválido' }),

  slots: z
    .array(templateSlotSchema)
    .min(1, 'Debe añadir al menos un cromo a la página')
    .max(50, 'Una página no puede tener más de 50 cromos'),
});

/**
 * Validation schema for complete template creation
 */
export const templateSchema = z.object({
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

  is_public: z.boolean().default(false),

  pages: z
    .array(templatePageSchema)
    .min(1, 'Debe añadir al menos una página')
    .max(20, 'Una plantilla no puede tener más de 20 páginas'),
});

/**
 * TypeScript types inferred from the schemas
 */
export type TemplateSlotData = z.infer<typeof templateSlotSchema>;
export type TemplatePageData = z.infer<typeof templatePageSchema>;
export type TemplateFormData = z.infer<typeof templateSchema>;

/**
 * Validation schema for template basic info (Step 1 of wizard)
 */
export const templateBasicInfoSchema = templateSchema.pick({
  title: true,
  description: true,
  image_url: true,
  is_public: true,
});

export type TemplateBasicInfoData = z.infer<typeof templateBasicInfoSchema>;

/**
 * Validation schema for template progress updates
 */
export const templateProgressSchema = z.object({
  slot_id: z.string().uuid('ID de slot inválido'),
  status: z.enum(['missing', 'owned', 'duplicate'], { message: 'Estado inválido' }),
  count: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(0, 'La cantidad no puede ser negativa')
    .max(999, 'La cantidad no puede exceder 999'),
});

export type TemplateProgressData = z.infer<typeof templateProgressSchema>;
