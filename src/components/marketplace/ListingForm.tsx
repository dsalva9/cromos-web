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
      terms_accepted: false,
    },
    mode: 'onChange',
  });

  const imageUrl = watch('image_url');
  const termsAccepted = watch('terms_accepted');
  const collectionName = watch('collection_name');

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
            <p className="text-sm text-gray-400">
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
              className={`bg-[#374151] border-2 text-white ${
                errors.title ? 'border-red-500' : 'border-black'
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
            <p className="text-xs text-gray-400">
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
                className={`bg-[#374151] border-2 text-white ${
                  errors.sticker_number ? 'border-red-500' : 'border-black'
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
                className={`bg-[#374151] border-2 text-white ${
                  errors.slot_variant ? 'border-red-500' : 'border-black'
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
              aria-invalid={!!errors.global_number}
              {...register('global_number', { valueAsNumber: true })}
              placeholder="ej. 123"
              className={`bg-[#374151] border-2 text-white ${
                errors.global_number ? 'border-red-500' : 'border-black'
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
              className={`bg-[#374151] border-2 text-white ${
                errors.page_title ? 'border-red-500' : 'border-black'
              }`}
            />
            {errors.page_title && (
              <p className="text-sm text-red-500">
                {errors.page_title.message as string}
              </p>
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
              className={`bg-[#374151] border-2 text-white resize-none ${
                errors.description ? 'border-red-500' : 'border-black'
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
                  className="text-sm text-gray-300 cursor-pointer"
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
                    {errors.terms_accepted.message as string}
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
              Términos de Uso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-gray-300">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident, sunt in culpa qui officia deserunt mollit
              anim id est laborum.
            </p>
            <h3 className="text-lg font-semibold text-white">
              1. Aceptación de los Términos
            </h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <h3 className="text-lg font-semibold text-white">
              2. Uso del Servicio
            </h3>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur.
            </p>
            <h3 className="text-lg font-semibold text-white">
              3. Contenido del Usuario
            </h3>
            <p>
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
              officia deserunt mollit anim id est laborum.
            </p>
            <h3 className="text-lg font-semibold text-white">
              4. Privacidad y Protección de Datos
            </h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
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

