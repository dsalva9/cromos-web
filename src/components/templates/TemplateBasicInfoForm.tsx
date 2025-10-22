'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import Image from 'next/image';

interface TemplateBasicInfoFormProps {
  data: {
    title: string;
    description: string;
    image_url: string;
    is_public: boolean;
  };
  onChange: (
    data: Partial<{
      title: string;
      description: string;
      image_url: string;
      is_public: boolean;
    }>
  ) => void;
}

export function TemplateBasicInfoForm({
  data,
  onChange,
}: TemplateBasicInfoFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    data.image_url || null
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real implementation, you would upload to a storage service
      // For now, we'll use a local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        onChange({ image_url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    onChange({ image_url: '' });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Título de la Plantilla *</Label>
        <Input
          id="title"
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Ej: Álbum Cromos Euro 2024"
          className="bg-[#1F2937] border-gray-600 text-white"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Describe tu plantilla..."
          rows={4}
          className="bg-[#1F2937] border-gray-600 text-white resize-none"
        />
      </div>

      {/* Image */}
      <div className="space-y-2">
        <Label>Imagen de la Plantilla</Label>
        {imagePreview ? (
          <div className="relative h-48 w-full">
            <Image
              src={imagePreview}
              alt="Template preview"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              className="object-cover rounded-md"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-500 border-red-500 text-white hover:bg-red-600"
            >
              Eliminar
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-600 rounded-md p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <span className="text-[#FFC000] hover:text-[#FFD700]">
                    Sube una imagen
                  </span>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, GIF hasta 10MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Public/Private */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="is-public">Hacer pública</Label>
          <p className="text-sm text-gray-400">
            Otros usuarios podrán ver y copiar esta plantilla
          </p>
        </div>
        <Switch
          id="is-public"
          checked={data.is_public}
          onCheckedChange={checked => onChange({ is_public: checked })}
        />
      </div>
    </div>
  );
}
