'use client';

import { useState, useEffect } from 'react';
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
import { PackagePlus, FileText, Library } from 'lucide-react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

// Simplified schema - only title, description, and images (mandatory)
const simplifiedListingSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  image_url: z.string().min(1, 'La imagen es obligatoria'),
  collection_name: z.string().optional().or(z.literal('')),
  is_group: z.boolean(),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los términos de uso',
  }),
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
  const [templates, setTemplates] = useState<Array<{ id: string; title: string }>>([]);

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
      terms_accepted: false,
    },
    mode: 'onChange',
  });

  // Fetch user's templates for the collection selector
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase.rpc('get_my_template_copies');
      if (data) {
        setTemplates(data.map((t: { copy_id: number; title: string }) => ({
          id: String(t.copy_id),
          title: t.title
        })));
      }
    };
    fetchTemplates();
  }, [supabase]);

  const imageUrl = watch('image_url');
  const termsAccepted = watch('terms_accepted');
  const isGroup = watch('is_group');

  const submitHandler = async (data: SimplifiedListingFormData) => {
    const payload: CreateListingForm = {
      title: data.title,
      description: data.description,
      sticker_number: '', // Not used anymore
      collection_name: data.collection_name || '',
      image_url: data.image_url,
      is_group: data.is_group,
      group_count: data.is_group ? 1 : undefined, // Will be set properly for bulk listings
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
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !isGroup
                      ? 'border-[#FFC000] bg-[#FFC000]/10'
                      : 'border-gray-600 bg-[#374151]'
                  }`}
                >
                  <FileText className={`h-6 w-6 mx-auto mb-2 ${!isGroup ? 'text-[#FFC000]' : 'text-gray-400'}`} />
                  <p className={`text-sm font-semibold ${!isGroup ? 'text-[#FFC000]' : 'text-gray-300'}`}>
                    Cromo Individual
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('is_group', true, { shouldValidate: true })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isGroup
                      ? 'border-[#FFC000] bg-[#FFC000]/10'
                      : 'border-gray-600 bg-[#374151]'
                  }`}
                >
                  <PackagePlus className={`h-6 w-6 mx-auto mb-2 ${isGroup ? 'text-[#FFC000]' : 'text-gray-400'}`} />
                  <p className={`text-sm font-semibold ${isGroup ? 'text-[#FFC000]' : 'text-gray-300'}`}>
                    Pack de Cromos
                  </p>
                </button>
              </div>
              {isGroup && (
                <p className="text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
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
            <p className="text-sm text-gray-400">
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
              className={`bg-[#374151] border-2 text-white ${
                errors.title ? 'border-red-500' : 'border-black'
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
                className="bg-[#374151] border-2 border-black text-white flex-1"
              />
              <Button
                type="button"
                onClick={() => setTemplatesDialogOpen(true)}
                className="bg-[#374151] hover:bg-[#4B5563] text-white border-2 border-black shrink-0"
                title="Seleccionar de mis plantillas"
              >
                <Library className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-400">
              Opcional: nombre de la colección o álbum
            </p>
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
              className={`bg-[#374151] border-2 text-white resize-none ${
                errors.description ? 'border-red-500' : 'border-black'
              }`}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
            <p className="text-sm text-gray-400">
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
              <p className="text-gray-400 text-center py-8">
                No tienes plantillas guardadas
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setValue('collection_name', template.title, { shouldValidate: true });
                      setTemplatesDialogOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-[#FFC000]"
                  >
                    <p className="text-white font-medium">{template.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-gray-700">
            <Button
              onClick={() => setTemplatesDialogOpen(false)}
              className="w-full bg-gray-700 text-white hover:bg-gray-600"
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
              Términos de Uso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-gray-300">
            <p>
              Al publicar un anuncio en CambioCromos, aceptas cumplir con las siguientes condiciones:
            </p>
            <h3 className="text-lg font-semibold text-white">
              1. Veracidad de la Información
            </h3>
            <p>
              Debes proporcionar información veraz y precisa sobre los cromos que ofreces.
              Las imágenes deben corresponder al artículo real.
            </p>
            <h3 className="text-lg font-semibold text-white">
              2. Responsabilidad del Usuario
            </h3>
            <p>
              Eres responsable de la descripción, precio y condiciones de tu anuncio.
              CambioCromos actúa como intermediario y no se hace responsable de las transacciones.
            </p>
            <h3 className="text-lg font-semibold text-white">
              3. Contenido Apropiado
            </h3>
            <p>
              No se permite contenido ofensivo, fraudulento o que infrinja derechos de terceros.
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
