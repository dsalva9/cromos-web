'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { AVATAR_PRESETS } from '@/constants/avatars';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { processImageBeforeUpload } from '@/lib/images/processImageBeforeUpload';
import { cn } from '@/lib/utils';

export type AvatarSelection =
  | { type: 'preset'; value: string }
  | { type: 'upload'; value: Blob; fileName: string }
  | { type: 'remove' };

interface AvatarPickerProps {
  currentAvatarUrl?: string | null;
  onSelect: (selection: AvatarSelection) => void;
  uploading?: boolean;
}

type TabValue = 'gallery' | 'upload';

export function AvatarPicker({
  currentAvatarUrl,
  onSelect,
  uploading = false,
}: AvatarPickerProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('gallery');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePresetSelect = (presetId: string, publicPath: string) => {
    setSelectedPresetId(presetId);
    setUploadPreview(null);
    onSelect({ type: 'preset', value: publicPath });
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 3MB');
      return;
    }

    try {
      setProcessing(true);

      // Process image: square, resize, convert to WebP
      const result = await processImageBeforeUpload(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 512,
        convertToWebP: true,
        quality: 0.85,
        forceSquare: true,
      });

      // Create preview URL
      const previewUrl = URL.createObjectURL(result.blob);
      setUploadPreview(previewUrl);
      setSelectedPresetId(null);

      // Generate filename
      const fileName = `avatar-${Date.now()}.webp`;

      // Emit selection
      onSelect({ type: 'upload', value: result.blob, fileName });

      toast.success('Imagen procesada correctamente');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al procesar la imagen'
      );
    } finally {
      setProcessing(false);
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    setUploadPreview(null);
    setSelectedPresetId(null);
    onSelect({ type: 'remove' });
  };

  const hasSelection = selectedPresetId || uploadPreview;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('gallery')}
          className={cn(
            'px-4 py-2 font-bold transition-colors relative',
            activeTab === 'gallery'
              ? 'text-[#FFC000] border-b-2 border-[#FFC000]'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Galería
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={cn(
            'px-4 py-2 font-bold transition-colors relative',
            activeTab === 'upload'
              ? 'text-[#FFC000] border-b-2 border-[#FFC000]'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Subir foto
        </button>
      </div>

      {/* Tab Content */}
      <div className="max-h-[50vh] md:max-h-[400px] overflow-y-auto pr-2">
        {activeTab === 'gallery' && (
          <div>
            <div className="grid grid-cols-4 gap-3 pb-2">
              {AVATAR_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id, preset.publicPath)}
                  disabled={uploading || processing}
                  className={cn(
                    'relative aspect-square rounded-lg border-2 overflow-hidden transition-all',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-gray-50',
                    selectedPresetId === preset.id
                      ? 'border-[#FFC000] shadow-lg shadow-[#FFC000]/50'
                      : 'border-gray-200 hover:border-gray-400'
                  )}
                  aria-label={preset.label}
                  title={preset.label}
                >
                  <Image
                    src={preset.publicPath}
                    alt={preset.label}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sube tu propia foto (será recortada a formato cuadrado)
            </p>

            {uploadPreview ? (
              <div className="relative w-48 h-48 mx-auto">
                <Image
                  src={uploadPreview}
                  alt="Vista previa"
                  fill
                  sizes="192px"
                  className="object-cover rounded-lg border-4 border-black"
                />
                <button
                  type="button"
                  onClick={() => setUploadPreview(null)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Eliminar vista previa"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <Upload className="h-12 w-12 text-gray-600 mb-3" />
                <Label htmlFor="avatar-file-upload" className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-2 border-black text-gray-900 bg-gray-50 hover:bg-[#FFC000] hover:text-gray-900"
                    disabled={processing || uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {processing ? 'Procesando...' : 'Seleccionar imagen'}
                  </Button>
                </Label>
                <input
                  ref={fileInputRef}
                  id="avatar-file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={processing || uploading}
                />
                <p className="text-xs text-gray-600 mt-3">
                  JPG, PNG o WebP • Máx. 3MB
                </p>
              </div>
            )}

            {processing && (
              <div className="flex items-center justify-center gap-2 text-[#FFC000]">
                <div className="animate-spin h-5 w-5 border-2 border-[#FFC000] border-r-transparent rounded-full" />
                <span className="text-sm font-bold">
                  Procesando imagen...
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        {currentAvatarUrl || hasSelection ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={uploading || processing}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <X className="h-4 w-4 mr-1" />
            Eliminar avatar
          </Button>
        ) : (
          <div />
        )}

        {uploading && (
          <div className="flex items-center gap-2 text-[#FFC000] text-sm">
            <div className="animate-spin h-4 w-4 border-2 border-[#FFC000] border-r-transparent rounded-full" />
            <span>Subiendo...</span>
          </div>
        )}
      </div>
    </div>
  );
}
