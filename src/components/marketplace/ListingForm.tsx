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
  listingSchema,
  type ListingFormData,
} from '@/lib/validations/marketplace.schemas';

interface ListingFormProps {
  initialData?: Partial<CreateListingForm>;
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
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      sticker_number: initialData?.sticker_number || '',
      collection_name: initialData?.collection_name || '',
      image_url: initialData?.image_url || '',
    },
    mode: 'onChange',
  });

  const imageUrl = watch('image_url');

  const submitHandler = async (data: ListingFormData) => {
    const payload: CreateListingForm = {
      title: data.title,
      description: data.description || '',
      sticker_number: data.sticker_number || '',
      collection_name: data.collection_name || '',
      image_url: data.image_url || undefined,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} noValidate>
      <ModernCard>
        <ModernCardContent className="p-6 space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagen del Cromo (Opcional)</Label>
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

          {/* Collection Name */}
          <div className="space-y-2">
            <Label htmlFor="collection">Colección (Opcional)</Label>
            <Input
              id="collection"
              aria-invalid={!!errors.collection_name}
              aria-describedby={
                errors.collection_name ? 'collection-error' : undefined
              }
              {...register('collection_name')}
              placeholder="ej. Panini LaLiga 2024/25"
              className={`bg-[#374151] border-2 text-white ${
                errors.collection_name ? 'border-red-500' : 'border-black'
              }`}
            />
            {errors.collection_name && (
              <p id="collection-error" className="text-sm text-red-500">
                {errors.collection_name.message as string}
              </p>
            )}
          </div>

          {/* Sticker Number */}
          <div className="space-y-2">
            <Label htmlFor="sticker">NAï¿½ï¿½ï¿½mero del Cromo (Opcional)</Label>
            <Input
              id="sticker"
              aria-invalid={!!errors.sticker_number}
              aria-describedby={
                errors.sticker_number ? 'sticker-error' : undefined
              }
              {...register('sticker_number')}
              placeholder="ej. #10"
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (Opcional)</Label>
            <Textarea
              id="description"
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? 'description-error' : undefined
              }
              {...register('description')}
              placeholder="Describe el estado del cromo, si estA! nuevo, usado, etc."
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
    </form>
  );
}

