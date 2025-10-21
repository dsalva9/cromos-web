'use client';

import { useState } from 'react';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/marketplace/ImageUpload';
import { CreateListingForm } from '@/types/v1.6.0';

interface ListingFormProps {
  initialData?: Partial<CreateListingForm>;
  onSubmit: (data: CreateListingForm) => Promise<void>;
  loading?: boolean;
}

export function ListingForm({
  initialData,
  onSubmit,
  loading,
}: ListingFormProps) {
  const [formData, setFormData] = useState<CreateListingForm>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    sticker_number: initialData?.sticker_number || '',
    collection_name: initialData?.collection_name || '',
    image_url: initialData?.image_url || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (formData.title.length < 3) {
      newErrors.title = 'El título debe tener al menos 3 caracteres';
    } else if (formData.title.length > 100) {
      newErrors.title = 'El título debe tener menos de 100 caracteres';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description =
        'La descripción debe tener menos de 500 caracteres';
    }

    if (formData.sticker_number && formData.sticker_number.length > 20) {
      newErrors.sticker_number =
        'El número del cromo debe tener menos de 20 caracteres';
    }

    if (formData.collection_name && formData.collection_name.length > 100) {
      newErrors.collection_name =
        'El nombre de la colección debe tener menos de 100 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit(formData);
  };

  const handleInputChange = (field: keyof CreateListingForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <ModernCard>
        <ModernCardContent className="p-6 space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagen del Cromo (Opcional)</Label>
            <ImageUpload
              value={formData.image_url}
              onChange={url => handleInputChange('image_url', url || '')}
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
              value={formData.title}
              onChange={e => handleInputChange('title', e.target.value)}
              placeholder="ej. Messi Inter Miami 2024"
              className="bg-[#374151] border-2 border-black text-white"
              maxLength={100}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
            <p className="text-sm text-gray-500">
              {formData.title.length} / 100 caracteres
            </p>
          </div>

          {/* Collection Name */}
          <div className="space-y-2">
            <Label htmlFor="collection">Colección (Opcional)</Label>
            <Input
              id="collection"
              value={formData.collection_name || ''}
              onChange={e =>
                handleInputChange('collection_name', e.target.value)
              }
              placeholder="ej. Panini LaLiga 2024/25"
              className="bg-[#374151] border-2 border-black text-white"
              maxLength={100}
            />
            {errors.collection_name && (
              <p className="text-sm text-red-500">{errors.collection_name}</p>
            )}
            <p className="text-sm text-gray-500">
              {formData.collection_name.length} / 100 caracteres
            </p>
          </div>

          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="number">Número del Cromo (Opcional)</Label>
            <Input
              id="number"
              value={formData.sticker_number || ''}
              onChange={e =>
                handleInputChange('sticker_number', e.target.value)
              }
              placeholder="ej. 245"
              className="bg-[#374151] border-2 border-black text-white"
              maxLength={20}
            />
            {errors.sticker_number && (
              <p className="text-sm text-red-500">{errors.sticker_number}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (Opcional)</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder="Detalles adicionales sobre el cromo..."
              rows={4}
              className="bg-[#374151] border-2 border-black text-white"
              maxLength={500}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
            <p className="text-sm text-gray-500">
              {formData.description?.length || 0} / 500 caracteres
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
            >
              {loading ? 'Publicando...' : 'Publicar Anuncio'}
            </Button>
          </div>
        </ModernCardContent>
      </ModernCard>
    </form>
  );
}
