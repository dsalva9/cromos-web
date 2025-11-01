import { z } from 'zod';

/**
 * Validation schema for template slot data
 */
export const templateSlotSchema = z.object({
  label: z
    .string()
    .min(1, 'La etiqueta del cromo es obligatoria')
    .max(50, 'La etiqueta no puede exceder 50 caracteres'),

  slot_number: z
    .number()
    .int('El número de slot debe ser un entero')
    .positive('El número de slot debe ser positivo'),

  is_special: z.boolean().default(false),

  slot_variant: z
    .string()
    .regex(/^[A-Z]$/, 'La variante debe ser una letra mayúscula (A-Z)')
    .optional()
    .or(z.literal('')),

  global_number: z
    .number()
    .int('El número de checklist debe ser un entero')
    .positive('El número de checklist debe ser positivo')
    .optional(),
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
}).refine(
  (page) => {
    // Check for duplicate (slot_number, slot_variant) combinations
    const combinations = new Set<string>();

    for (const slot of page.slots) {
      const variant = slot.slot_variant || 'NULL'; // Treat undefined/empty as NULL
      const key = `${slot.slot_number}-${variant}`;

      if (combinations.has(key)) {
        return false; // Duplicate found
      }
      combinations.add(key);
    }

    return true;
  },
  {
    message: 'Cada combinación de número y variante debe ser única en la página. Si hay dos cromos con el mismo número, deben tener variantes diferentes (A, B, etc.)',
    path: ['slots'],
  }
);

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
    .url('La URL de la imagen no es válida')
    .optional()
    .or(z.literal('')),

  is_public: z.boolean().default(false),

  pages: z
    .array(templatePageSchema)
    .min(1, 'Debe añadir al menos una página')
    .max(20, 'Una plantilla no puede tener más de 20 páginas'),
}).refine(
  (data) => {
    // Collect all global numbers from all pages
    const globalNumbers: number[] = [];

    for (const page of data.pages) {
      for (const slot of page.slots) {
        if (slot.global_number !== undefined) {
          globalNumbers.push(slot.global_number);
        }
      }
    }

    // Check for duplicates
    const uniqueGlobalNumbers = new Set(globalNumbers);
    return globalNumbers.length === uniqueGlobalNumbers.size;
  },
  {
    message: 'Los números de checklist globales deben ser únicos en toda la plantilla',
    path: ['pages'],
  }
);

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
