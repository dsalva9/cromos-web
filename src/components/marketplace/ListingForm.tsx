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
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);

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
      terms_accepted: false,
    },
    mode: 'onChange',
  });

  const imageUrl = watch('image_url');
  const termsAccepted = watch('terms_accepted');

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
            <Label htmlFor="sticker">Número del Cromo (Opcional)</Label>
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

