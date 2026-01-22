'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import type { TemplateBasicInfoData } from '@/lib/validations/template.schemas';
import { CameraCaptureModal } from '@/components/marketplace/CameraCaptureModal';

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
  errors?: Partial<Record<keyof TemplateBasicInfoData, string>>;
}

export function TemplateBasicInfoForm({
  data,
  onChange,
  errors,
}: TemplateBasicInfoFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    data.image_url || null
  );
  const [cameraOpen, setCameraOpen] = useState(false);
  const [supportsCamera] = useState(() =>
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        onChange({ image_url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (blob: Blob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      onChange({ image_url: result });
    };
    reader.readAsDataURL(blob);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    onChange({ image_url: '' });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Título de la Colección *</Label>
          <Input
            id="title"
            aria-invalid={!!errors?.title}
            aria-describedby={errors?.title ? 'template-title-error' : undefined}
            value={data.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="Ej: Álbum Cromos Euro 2024"
            className={`bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white ${errors?.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
              }`}
            required
          />
          {errors?.title && (
            <p id="template-title-error" className="text-sm text-red-500">
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            aria-invalid={!!errors?.description}
            aria-describedby={
              errors?.description ? 'template-description-error' : undefined
            }
            value={data.description}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Describe tu colección..."
            rows={4}
            className={`bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white resize-none ${errors?.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
              }`}
          />
          {errors?.description && (
            <p id="template-description-error" className="text-sm text-red-500">
              {errors.description}
            </p>
          )}
        </div>

        {/* Image */}
        <div className="space-y-2">
          <Label>
            Imagen de la Colección <span className="text-red-500">*</span>
          </Label>
          {imagePreview ? (
            <div className="relative min-h-[250px] max-h-[500px] w-full bg-gray-50 dark:bg-gray-900 rounded-md overflow-hidden flex items-center justify-center">
              <Image
                src={imagePreview}
                alt="Template preview"
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-contain rounded-md"
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
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md p-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-gray-900 dark:text-white font-bold mb-2">Añadir Imagen</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Sube una foto de tu colección
                  </p>
                  <div className="flex gap-2 justify-center">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button
                        type="button"
                        className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Elegir
                      </Button>
                    </div>
                    {supportsCamera && (
                      <Button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        variant="outline"
                        className="border-2 border-[#FFC000] text-[#FFC000] hover:bg-[#FFC000] hover:text-black"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Cámara
                      </Button>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                    JPG, PNG o WebP (máx. 5MB)
                  </p>
                </div>
              </div>
            </div>
          )}
          {errors?.image_url && (
            <p className="text-sm text-red-500">{errors.image_url}</p>
          )}
        </div>

        {/* Public/Private */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="is-public" className="text-gray-900 dark:text-white">Hacer privada</Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Si activas esta opción, otros usuarios no podrán ver ni copiar esta colección
            </p>
          </div>
          <Switch
            id="is-public"
            checked={!data.is_public}
            onCheckedChange={(checked) => onChange({ is_public: !checked })}
          />
        </div>
      </div>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </>
  );
}

