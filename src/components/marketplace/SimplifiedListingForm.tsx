'use client';

import { useState, useEffect, useCallback } from 'react';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageUpload } from '@/components/marketplace/ImageUpload';
import { CreateListingForm } from '@/types/v1.6.0';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PackagePlus, FileText, Library, ChevronDown, ChevronRight, X, LinkIcon } from 'lucide-react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

// Simplified schema - only title, description, and images (mandatory)
const simplifiedListingSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  image_url: z.string().min(1, 'La imagen es obligatoria'),
  collection_name: z.string().optional().or(z.literal('')),
  is_group: z.boolean(),
  listing_type: z.enum(['intercambio', 'venta', 'ambos']),
  price: z.number().positive('El precio debe ser mayor que 0').max(99999).optional(),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los términos de uso',
  }),
}).superRefine((data, ctx) => {
  if ((data.listing_type === 'venta' || data.listing_type === 'ambos') && (!data.price || data.price <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El precio es obligatorio cuando el anuncio incluye venta',
      path: ['price'],
    });
  }
});

type SimplifiedListingFormData = z.infer<typeof simplifiedListingSchema>;

interface SimplifiedListingFormProps {
  initialData?: Partial<CreateListingForm>;
  onSubmit: (data: CreateListingForm) => Promise<void>;
  loading?: boolean;
  disablePackOption?: boolean;
}

export function SimplifiedListingForm({
  initialData,
  onSubmit,
  loading,
  disablePackOption = false,
}: SimplifiedListingFormProps) {
  const supabase = useSupabaseClient();
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ copy_id: number; template_id: number; title: string }>>([]);

  // Slot picker state
  interface TemplateSlot {
    id: number;
    slot_number: number;
    slot_variant: string | null;
    global_number: number | null;
    label: string | null;
    is_special: boolean;
  }
  interface TemplatePage {
    id: number;
    page_number: number;
    title: string;
    type: string;
    slots_count: number;
    slots: TemplateSlot[];
  }
  const [selectedCopy, setSelectedCopy] = useState<{ copy_id: number; template_id: number; title: string } | null>(null);
  const [templatePages, setTemplatePages] = useState<TemplatePage[]>([]);
  const [selectedPage, setSelectedPage] = useState<TemplatePage | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TemplateSlot | null>(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [slotPickerExpanded, setSlotPickerExpanded] = useState(false);
  const [expandedPageId, setExpandedPageId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SimplifiedListingFormData>({
    resolver: zodResolver(simplifiedListingSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      image_url: initialData?.image_url || '',
      collection_name: initialData?.collection_name || '',
      is_group: initialData?.is_group || false,
      listing_type: (initialData as any)?.listing_type || 'intercambio',
      price: (initialData as any)?.price || undefined,
      terms_accepted: false,
    },
    mode: 'onChange',
  });

  // Fetch user's templates for the collection selector
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase.rpc('get_my_template_copies');
      if (data) {
        setTemplates(data.map((t: { copy_id: number; template_id: number; title: string }) => ({
          copy_id: t.copy_id,
          template_id: t.template_id,
          title: t.title
        })));
      }
    };
    fetchTemplates();
  }, [supabase]);

  // Fetch template pages/slots when a template copy is selected
  const fetchTemplatePages = useCallback(async (templateId: number) => {
    setLoadingPages(true);
    try {
      const { data, error } = await supabase.rpc('get_template_details', { p_template_id: templateId });
      if (error) throw error;
      const result = data as { pages?: TemplatePage[] } | null;
      setTemplatePages(result?.pages || []);
    } catch (err) {
      logger.error('Error fetching template pages:', err);
      setTemplatePages([]);
    } finally {
      setLoadingPages(false);
    }
  }, [supabase]);

  // Handle template selection from dialog
  const handleTemplateSelect = useCallback((template: { copy_id: number; template_id: number; title: string }) => {
    setSelectedCopy(template);
    setValue('collection_name', template.title, { shouldValidate: true });
    setTemplatesDialogOpen(false);
    setSelectedPage(null);
    setSelectedSlot(null);
    setSlotPickerExpanded(true);
    fetchTemplatePages(template.template_id);
  }, [setValue, fetchTemplatePages]);

  // Handle slot selection
  const handleSlotSelect = useCallback((page: TemplatePage, slot: TemplateSlot) => {
    setSelectedPage(page);
    setSelectedSlot(slot);
    setSlotPickerExpanded(false);
  }, []);

  // Clear slot link
  const handleClearSlotLink = useCallback(() => {
    setSelectedCopy(null);
    setSelectedPage(null);
    setSelectedSlot(null);
    setTemplatePages([]);
    setSlotPickerExpanded(false);
  }, []);

  const imageUrl = watch('image_url');
  const termsAccepted = watch('terms_accepted');
  const isGroup = watch('is_group');
  const listingType = watch('listing_type');

  // Derive checkbox states from listing_type
  const isForExchange = listingType === 'intercambio' || listingType === 'ambos';
  const isForSale = listingType === 'venta' || listingType === 'ambos';

  const handleListingTypeChange = (exchange: boolean, sale: boolean) => {
    let newType: 'intercambio' | 'venta' | 'ambos' = 'intercambio';
    if (exchange && sale) newType = 'ambos';
    else if (sale) newType = 'venta';
    else if (exchange) newType = 'intercambio';
    else return;
    setValue('listing_type', newType, { shouldValidate: true });
    if (!sale) {
      setValue('price', undefined, { shouldValidate: true });
    }
  };

  const submitHandler = async (data: SimplifiedListingFormData) => {
    const payload: CreateListingForm = {
      title: data.title,
      description: data.description,
      sticker_number: selectedSlot
        ? `${selectedSlot.slot_number}${selectedSlot.slot_variant || ''}`
        : '',
      collection_name: data.collection_name || '',
      image_url: data.image_url,
      is_group: data.is_group,
      group_count: data.is_group ? 1 : undefined,
      listing_type: data.listing_type || 'intercambio',
      price: data.price || undefined,
      // Slot metadata (when linked to an album slot)
      ...(selectedSlot && selectedCopy && selectedPage ? {
        copy_id: selectedCopy.copy_id,
        slot_id: selectedSlot.id,
        page_number: selectedPage.page_number,
        page_title: selectedPage.title,
        slot_variant: selectedSlot.slot_variant || undefined,
        global_number: selectedSlot.global_number || undefined,
      } : {}),
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} noValidate>
      <ModernCard>
        <ModernCardContent className="p-6 space-y-6">
          {/* Listing Type Toggle */}
          {!disablePackOption && (
            <div className="space-y-3">
              <Label>Tipo de Anuncio</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue('is_group', false, { shouldValidate: true })}
                  className={`p-4 rounded-lg border-2 transition-all ${!isGroup
                    ? 'border-[#FFC000] bg-[#FFC000]/10'
                    : 'border-gray-200 bg-white'
                    }`}
                >
                  <FileText className={`h-6 w-6 mx-auto mb-2 ${!isGroup ? 'text-[#FFC000]' : 'text-gray-600'}`} />
                  <p className={`text-sm font-semibold ${!isGroup ? 'text-[#FFC000]' : 'text-gray-700'}`}>
                    Cromo Individual
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('is_group', true, { shouldValidate: true })}
                  className={`p-4 rounded-lg border-2 transition-all ${isGroup
                    ? 'border-[#FFC000] bg-[#FFC000]/10'
                    : 'border-gray-200 bg-white'
                    }`}
                >
                  <PackagePlus className={`h-6 w-6 mx-auto mb-2 ${isGroup ? 'text-[#FFC000]' : 'text-gray-600'}`} />
                  <p className={`text-sm font-semibold ${isGroup ? 'text-[#FFC000]' : 'text-gray-700'}`}>
                    Pack de Cromos
                  </p>
                </button>
              </div>
              {isGroup && (
                <p className="text-xs text-yellow-800 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 p-3 rounded-lg">
                  ℹ️ Estás creando un anuncio para múltiples cromos. Describe todos los cromos en la descripción.
                </p>
              )}
            </div>
          )}

          {/* Image Upload - MANDATORY */}
          <div className="space-y-2">
            <Label>
              Imagen <span className="text-red-500">*</span>
            </Label>
            <ImageUpload
              value={imageUrl}
              onChange={url => setValue('image_url', url || '', { shouldValidate: true })}
            />
            {errors.image_url && (
              <p className="text-sm text-red-500">{errors.image_url.message}</p>
            )}
            <p className="text-sm text-gray-600">
              La imagen es obligatoria para publicar un anuncio
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder={isGroup ? "ej. Pack de 10 cromos de la Liga" : "ej. Messi Inter Miami 2024"}
              className={`bg-white border-2 text-gray-900 ${errors.title ? 'border-red-500' : 'border-black'
                }`}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Collection */}
          <div className="space-y-2">
            <Label htmlFor="collection_name">Colección</Label>
            <div className="flex gap-2">
              <Input
                id="collection_name"
                {...register('collection_name')}
                placeholder="ej. Panini LaLiga 2024"
                className="bg-white border-2 border-black text-gray-900 flex-1"
              />
              <Button
                type="button"
                onClick={() => setTemplatesDialogOpen(true)}
                className="bg-white hover:bg-gray-100 text-gray-900 border-2 border-black shrink-0"
                title="Seleccionar de mis plantillas"
              >
                <Library className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              Opcional: nombre de la colección o álbum
            </p>
          </div>

          {/* Slot Picker - shown when a template copy is selected and it's individual */}
          {selectedCopy && !isGroup && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Vincular a cromo del álbum
                </Label>
                <button
                  type="button"
                  onClick={handleClearSlotLink}
                  className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  Desvincular
                </button>
              </div>

              {selectedSlot && selectedPage ? (
                /* Selected slot display */
                <div className="flex items-center gap-2 bg-green-50 border-2 border-green-200 rounded-lg p-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-800">
                      #{selectedSlot.slot_number}{selectedSlot.slot_variant || ''} — {selectedSlot.label || `Cromo ${selectedSlot.slot_number}`}
                    </p>
                    <p className="text-xs text-green-600">{selectedPage.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedSlot(null); setSelectedPage(null); setSlotPickerExpanded(true); }}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                /* Page/slot picker */
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSlotPickerExpanded(!slotPickerExpanded)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-700"
                  >
                    <span>Seleccionar cromo de <strong>{selectedCopy.title}</strong></span>
                    {slotPickerExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {slotPickerExpanded && (
                    <div className="max-h-64 overflow-y-auto border-t border-gray-200">
                      {loadingPages ? (
                        <div className="p-4 text-center text-gray-500 text-sm">Cargando páginas...</div>
                      ) : templatePages.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No se encontraron páginas</div>
                      ) : (
                        templatePages.map(page => (
                          <div key={page.id}>
                            {/* Page header - collapsible */}
                            <button
                              type="button"
                              onClick={() => setExpandedPageId(expandedPageId === page.id ? null : page.id)}
                              className="w-full px-3 py-2.5 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-between border-b border-gray-200"
                            >
                              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                {page.title} ({page.slots_count})
                              </span>
                              {expandedPageId === page.id
                                ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                              }
                            </button>
                            {/* Slots - shown only when page is expanded */}
                            {expandedPageId === page.id && page.slots?.map(slot => (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => handleSlotSelect(page, slot)}
                                className="w-full text-left px-3 py-2 hover:bg-[#FFC000]/10 transition-colors flex items-center gap-2 text-sm border-b border-gray-100 last:border-b-0"
                              >
                                <span className="font-mono text-xs text-gray-400 w-8 text-right shrink-0">#{slot.slot_number}</span>
                                <span className="text-gray-900 truncate">{slot.label || `Cromo ${slot.slot_number}`}</span>
                                {slot.is_special && (
                                  <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded font-bold shrink-0">ESP</span>
                                )}
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Opcional: vincular a un cromo específico mejora la visibilidad en los álbumes de otros usuarios
              </p>
            </div>
          )}

          {/* Listing Type - Exchange / Sale */}
          <div className="space-y-3">
            <Label>Tipo de Anuncio <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleListingTypeChange(!isForExchange, isForSale)}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${isForExchange
                  ? 'border-[#FFC000] bg-[#FFC000]/10'
                  : 'border-gray-200 bg-white'
                  }`}
              >
                <span className="text-xl">🔄</span>
                <span className={`text-sm font-semibold ${isForExchange ? 'text-[#FFC000]' : 'text-gray-700'}`}>
                  Intercambio
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleListingTypeChange(isForExchange, !isForSale)}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${isForSale
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white'
                  }`}
              >
                <span className="text-xl">💰</span>
                <span className={`text-sm font-semibold ${isForSale ? 'text-green-600' : 'text-gray-700'}`}>
                  Venta
                </span>
              </button>
            </div>

            {isForSale && (
              <div className="space-y-2">
                <Label htmlFor="price">Precio (€) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    {...register('price', { valueAsNumber: true })}
                    placeholder="ej. 5.00"
                    className={`bg-white border-2 text-gray-900 pl-8 ${errors.price ? 'border-red-500' : 'border-black'
                      }`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
                </div>
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={
                isGroup
                  ? "Describe todos los cromos incluidos en el pack, su estado, etc."
                  : "Describe el cromo, su estado, características especiales, etc."
              }
              rows={6}
              className={`bg-white border-2 text-gray-900 resize-none ${errors.description ? 'border-red-500' : 'border-black'
                }`}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
            <p className="text-sm text-gray-600">
              {isGroup
                ? "Lista todos los cromos incluidos con sus detalles"
                : "Incluye número, colección, rareza, y cualquier detalle relevante"}
            </p>
          </div>

          {/* Terms of Use */}
          <div className="space-y-2 pt-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setValue('terms_accepted', checked === true, {
                    shouldValidate: true,
                  })
                }
                className="mt-1 border-2 border-gray-400 dark:border-gray-300 data-[state=checked]:bg-[#FFC000] data-[state=checked]:border-[#FFC000]"
              />
              <div className="flex-1">
                <Label
                  htmlFor="terms"
                  className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  He leído y estoy de acuerdo con los{' '}
                  <button
                    type="button"
                    onClick={() => setTermsDialogOpen(true)}
                    className="text-[#FFC000] hover:text-[#FFD700] underline"
                  >
                    términos de uso
                  </button>
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                {errors.terms_accepted && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.terms_accepted.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={loading || isSubmitting}
              className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
            >
              {loading || isSubmitting ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Templates Selector Dialog */}
      <Dialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Mis Plantillas
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No tienes plantillas guardadas
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.copy_id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 hover:border-[#FFC000]"
                  >
                    <p className="text-gray-900 font-medium">{template.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={() => setTemplatesDialogOpen(false)}
              className="w-full bg-gray-200 text-gray-900 hover:bg-gray-300"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms Dialog */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Términos de Uso - Publicación de Cromos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-gray-700">
            <p>
              Recuerda que las imágenes, descripciones o nombres que subas deben ser tuyos o contar con los derechos necesarios para usarlos. Cambiocromos.com no publica contenido por ti, solo te ofrece el espacio para compartirlo con otros coleccionistas. El usuario es el único responsable del contenido que publique. Si subes imágenes que infrinjan derechos de autor, marcas registradas o cualquier norma legal, podremos retirarlas y suspender tu cuenta. Cambiocromos.com no es propietaria de los cromos ni intermedia en las ventas o intercambios; solo pone en contacto a los usuarios. Al continuar, declaras que tienes derecho a publicar el contenido y aceptas nuestra Política de contenidos.
            </p>
            <div className="pt-4">
              <Button
                onClick={() => setTermsDialogOpen(false)}
                className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700]"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
