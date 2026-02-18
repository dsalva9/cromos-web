'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/marketplace/ImageUpload';
import { CreateListingForm } from '@/types/v1.6.0';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  editListingSchema,
  type EditListingFormData,
} from '@/lib/validations/marketplace.schemas';

interface EditListingFormInitialData {
  title: string;
  description: string;
  image_url: string;
  collection_name?: string;
  sticker_number?: string;
  slot_variant?: string;
  page_number?: number | null;
  page_title?: string;
  global_number?: number | null;
  listing_type?: 'intercambio' | 'venta' | 'ambos';
  price?: number;
}

interface ListingFormProps {
  initialData: EditListingFormInitialData;
  onSubmit: (data: CreateListingForm) => Promise<void>;
  loading?: boolean;
}

export function ListingForm({ initialData, onSubmit, loading }: ListingFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditListingFormData>({
    resolver: zodResolver(editListingSchema),
    defaultValues: {
      title: initialData.title || '',
      description: initialData.description || '',
      image_url: initialData.image_url || '',
      listing_type: initialData.listing_type || 'intercambio',
      price: initialData.price || undefined,
    },
    mode: 'onChange',
  });

  const imageUrl = watch('image_url');
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

  const submitHandler = async (data: EditListingFormData) => {
    const payload: CreateListingForm = {
      title: data.title,
      description: data.description || '',
      sticker_number: initialData.sticker_number || '',
      collection_name: initialData.collection_name || '',
      image_url: data.image_url || undefined,
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
              {...register('title')}
              placeholder="ej. Messi Inter Miami 2024"
              className={`bg-white border-2 text-gray-900 ${errors.title ? 'border-red-500' : 'border-black'
                }`}
            />
            {errors.title && (
              <p className="text-sm text-red-500">
                {errors.title.message as string}
              </p>
            )}
          </div>

          {/* Read-only Cromo Details — mirrors the detail page "Detalles del Cromo" card */}
          {(initialData.collection_name || initialData.sticker_number || initialData.page_number || initialData.global_number) && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">Detalles del Cromo</h3>
              {initialData.collection_name && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">Colección:</span>{' '}
                  {initialData.collection_name}
                </div>
              )}
              {(initialData.page_number || initialData.page_title) && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">Página:</span>{' '}
                  {initialData.page_number && `${initialData.page_number}`}
                  {initialData.page_number && initialData.page_title && ' - '}
                  {initialData.page_title}
                </div>
              )}
              {(initialData.sticker_number || initialData.slot_variant) && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">Número de cromo:</span>{' '}
                  #{initialData.sticker_number}
                  {initialData.slot_variant && initialData.slot_variant}
                </div>
              )}
              {initialData.global_number && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">Número global:</span>{' '}
                  #{initialData.global_number}
                </div>
              )}
            </div>
          )}

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
              {...register('description')}
              placeholder="Describe el estado del cromo, si está nuevo, usado, etc."
              rows={4}
              className={`bg-white border-2 text-gray-900 resize-none ${errors.description ? 'border-red-500' : 'border-black'
                }`}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message as string}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || isSubmitting}
            className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold text-lg py-6 border-2 border-black"
          >
            {loading || isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </ModernCardContent>
      </ModernCard>
    </form>
  );
}
