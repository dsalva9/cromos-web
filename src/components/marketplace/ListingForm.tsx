'use client';

import { useState } from 'react';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageUpload } from '@/components/marketplace/ImageUpload';
import { CollectionCombobox } from '@/components/marketplace/CollectionCombobox';
import { SlotSelectionModal } from '@/components/marketplace/SlotSelectionModal';
import { CreateListingForm } from '@/types/v1.6.0';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  listingSchema,
  type ListingFormData,
} from '@/lib/validations/marketplace.schemas';
import { useTemplateSlots, TemplateSlot } from '@/hooks/templates/useTemplateSlots';

interface ListingFormProps {
  initialData?: Partial<CreateListingForm>;
  onSubmit: (data: CreateListingForm) => Promise<void>;
  loading?: boolean;
}

export function ListingForm({ initialData, onSubmit, loading }: ListingFormProps) {
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [selectedCollectionTitle, setSelectedCollectionTitle] = useState('');
  const [selectedCopyId, setSelectedCopyId] = useState<number | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const { slots, loading: slotsLoading, fetchSlots } = useTemplateSlots();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      sticker_number: initialData?.sticker_number || '',
      collection_name: initialData?.collection_name || '',
      image_url: initialData?.image_url || '',
      page_number: initialData?.page_number,
      page_title: initialData?.page_title || '',
      slot_variant: initialData?.slot_variant || '',
      global_number: initialData?.global_number,
      listing_type: (initialData as any)?.listing_type || 'intercambio',
      price: (initialData as any)?.price || undefined,
      terms_accepted: false,
    },
    mode: 'onChange',
  });

  const imageUrl = watch('image_url');
  const termsAccepted = watch('terms_accepted');
  const collectionName = watch('collection_name');
  const listingType = watch('listing_type');

  // Derive checkbox states from listing_type
  const isForExchange = listingType === 'intercambio' || listingType === 'ambos';
  const isForSale = listingType === 'venta' || listingType === 'ambos';

  const handleListingTypeChange = (exchange: boolean, sale: boolean) => {
    let newType: 'intercambio' | 'venta' | 'ambos' = 'intercambio';
    if (exchange && sale) newType = 'ambos';
    else if (sale) newType = 'venta';
    else if (exchange) newType = 'intercambio';
    // At least one must be selected — if both unchecked, keep current
    else return;
    setValue('listing_type', newType, { shouldValidate: true });
    // Clear price when not for sale
    if (!sale) {
      setValue('price', undefined, { shouldValidate: true });
    }
  };

  // Handle collection selection from combobox
  const handleCollectionSelect = async (copyId: number, title: string) => {
    setSelectedCollectionTitle(title);
    setSelectedCopyId(copyId);

    // Fetch slots for this collection
    await fetchSlots(copyId);

    // Open slot selection modal
    setSlotModalOpen(true);
  };

  // Handle slot selection
  const handleSlotSelect = (slot: TemplateSlot) => {
    // Auto-populate title with sticker label (name)
    if (slot.slot_label) {
      setValue('title', slot.slot_label, { shouldValidate: true });
    }

    // Auto-populate sticker number: just the slot number (not variant)
    setValue('sticker_number', String(slot.slot_number), { shouldValidate: true });

    // Auto-populate Panini fields
    if (slot.global_number) {
      setValue('global_number', slot.global_number, { shouldValidate: true });
    }
    if (slot.slot_variant) {
      setValue('slot_variant', slot.slot_variant, { shouldValidate: true });
    }
    if (slot.page_number) {
      setValue('page_number', slot.page_number, { shouldValidate: true });
    }
    if (slot.page_title) {
      setValue('page_title', slot.page_title, { shouldValidate: true });
    }

    // Store slot_id for template linking
    setSelectedSlotId(slot.slot_id);
  };

  const submitHandler = async (data: ListingFormData) => {
    const payload: CreateListingForm = {
      title: data.title,
      description: data.description || '',
      sticker_number: data.sticker_number || '',
      collection_name: data.collection_name || '',
      image_url: data.image_url || undefined,
      copy_id: selectedCopyId || undefined,
      slot_id: selectedSlotId || undefined,
      // Panini fields
      page_number: data.page_number || undefined,
      page_title: data.page_title || undefined,
      slot_variant: data.slot_variant || undefined,
      global_number: data.global_number || undefined,
      // Listing type fields
      listing_type: data.listing_type || 'intercambio',
      price: data.price || undefined,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} noValidate>
      <ModernCard>
        <ModernCardContent className="p-6 space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagen del Cromo</Label>
            <ImageUpload
              value={imageUrl}
              onChange={url => setValue('image_url', url || '')}
            />
            <p className="text-sm text-gray-600">
              Sube una foto de tu cromo para mayor visibilidad
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
              {...register('title')}
              placeholder="ej. Messi Inter Miami 2024"
              className={`bg-white border-2 text-gray-900 ${errors.title ? 'border-red-500' : 'border-black'
                }`}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-red-500">
                {errors.title.message as string}
              </p>
            )}
          </div>

          {/* Collection Name - Combobox */}
          <div className="space-y-2">
            <Label htmlFor="collection">Colección</Label>
            <CollectionCombobox
              value={collectionName || ''}
              onChange={value => setValue('collection_name', value)}
              onCollectionSelect={handleCollectionSelect}
              placeholder="Buscar o seleccionar colección..."
              className={errors.collection_name ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-600">
              Selecciona de tus colecciones para auto-completar el número, o escribe libremente
            </p>
            {errors.collection_name && (
              <p id="collection-error" className="text-sm text-red-500">
                {errors.collection_name.message as string}
              </p>
            )}
          </div>

          {/* Sticker Number + Variant (side by side) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sticker">Número del Cromo</Label>
              <Input
                id="sticker"
                aria-invalid={!!errors.sticker_number}
                aria-describedby={
                  errors.sticker_number ? 'sticker-error' : undefined
                }
                {...register('sticker_number')}
                placeholder="ej. 10, 5A"
                className={`bg-white border-2 text-gray-900 ${errors.sticker_number ? 'border-red-500' : 'border-black'
                  }`}
              />
              {errors.sticker_number && (
                <p id="sticker-error" className="text-sm text-red-500">
                  {errors.sticker_number.message as string}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot_variant">Variante</Label>
              <Input
                id="slot_variant"
                aria-invalid={!!errors.slot_variant}
                {...register('slot_variant')}
                placeholder="ej. A, B"
                className={`bg-white border-2 text-gray-900 ${errors.slot_variant ? 'border-red-500' : 'border-black'
                  }`}
              />
              {errors.slot_variant && (
                <p className="text-sm text-red-500">
                  {errors.slot_variant.message as string}
                </p>
              )}
            </div>
          </div>

          {/* Global Number */}
          <div className="space-y-2">
            <Label htmlFor="global_number">Número Global</Label>
            <Input
              id="global_number"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-invalid={!!errors.global_number}
              {...register('global_number', { valueAsNumber: true })}
              placeholder="ej. 123"
              className={`bg-white border-2 text-gray-900 ${errors.global_number ? 'border-red-500' : 'border-black'
                }`}
            />
            {errors.global_number && (
              <p className="text-sm text-red-500">
                {errors.global_number.message as string}
              </p>
            )}
          </div>

          {/* Page Title */}
          <div className="space-y-2">
            <Label htmlFor="page_title">Título de Página</Label>
            <Input
              id="page_title"
              aria-invalid={!!errors.page_title}
              {...register('page_title')}
              placeholder="ej. Delanteros"
              className={`bg-white border-2 text-gray-900 ${errors.page_title ? 'border-red-500' : 'border-black'
                }`}
            />
            {errors.page_title && (
              <p className="text-sm text-red-500">
                {errors.page_title.message as string}
              </p>
            )}
          </div>

          {/* Listing Type - Exchange / Sale */}
          <div className="space-y-3">
            <Label>Tipo de Anuncio <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Intercambio checkbox */}
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

              {/* Venta checkbox */}
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

            {/* Price input - visible when sale is selected */}
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
                  <p className="text-sm text-red-500">{errors.price.message as string}</p>
                )}
              </div>
            )}

            {errors.listing_type && (
              <p className="text-sm text-red-500">{errors.listing_type.message as string}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? 'description-error' : undefined
              }
              {...register('description')}
              placeholder="Describe el estado del cromo, si está nuevo, usado, etc."
              rows={4}
              className={`bg-white border-2 text-gray-900 resize-none ${errors.description ? 'border-red-500' : 'border-black'
                }`}
            />
            {errors.description && (
              <p id="description-error" className="text-sm text-red-500">
                {errors.description.message as string}
              </p>
            )}
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
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor="terms"
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  Confirmo que tengo más de 18 años, que poseo los derechos de este contenido y <strong>acepto toda la responsabilidad</strong> sobre esta publicación.{' '}
                  <button
                    type="button"
                    onClick={() => setTermsDialogOpen(true)}
                    className="text-[#FFC000] hover:text-[#FFD700] underline ml-1"
                  >
                    Ver condiciones
                  </button>
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                {errors.terms_accepted && (
                  <p className="text-sm text-red-500 mt-1">
                    Debes aceptar la responsabilidad sobre el contenido para publicar.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              aria-label="Publicar anuncio"
              disabled={loading || isSubmitting}
              className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
            >
              {loading || isSubmitting ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Slot Selection Modal */}
      <SlotSelectionModal
        open={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
        slots={slots}
        loading={slotsLoading}
        onSlotSelect={handleSlotSelect}
        collectionTitle={selectedCollectionTitle}
      />

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
              <strong>AVISO IMPORTANTE:</strong> Al hacer clic en "Publicar", declaras bajo tu exclusiva responsabilidad que:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Tienes <strong>más de 18 años</strong>.</li>
              <li>Eres el propietario legítimo de los derechos de imagen o tienes autorización para usarlos.</li>
              <li>El contenido no infringe derechos de autor, ni contiene material ofensivo, ilegal o prohibido.</li>
            </ul>
            <p className="mt-4">
              Cambiocromos.com actúa únicamente como intermediario. <strong>Tú eres el único responsable legal</strong> del contenido que subes. Nos reservamos el derecho de eliminar cualquier contenido y suspender cuentas que violen estas normas sin previo aviso.
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

