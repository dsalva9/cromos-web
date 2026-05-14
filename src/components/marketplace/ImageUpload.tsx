'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { CameraCaptureModal } from '@/components/marketplace/CameraCaptureModal';
import { processImageBeforeUpload, generateThumbnail } from '@/lib/images/processImageBeforeUpload';

interface ImageUploadProps {
  value?: string | null;
  /**
   * Called after upload completes.
   * @param imageUrl     - Public URL of the full-size image (marketplace/{id}.webp)
   * @param thumbnailUrl - Public URL of the 400px thumbnail (marketplace/{id}-thumb.webp),
   *                       or null if the thumbnail upload failed (non-fatal)
   */
  onChange: (imageUrl: string | null, thumbnailUrl?: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const supabase = useSupabaseClient();
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [supportsCamera] = useState(() =>
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
  );

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 5MB');
      return;
    }

    await uploadImage(file);
  };

  const uploadImage = async (file: File | Blob, fileName?: string) => {
    try {
      setUploading(true);

      // Always compress and convert to WebP before upload
      const fileToProcess =
        file instanceof File
          ? file
          : new File([file], 'upload.jpg', { type: file.type || 'image/jpeg' });

      const result = await processImageBeforeUpload(fileToProcess, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1600,
        convertToWebP: true,
        quality: 0.85,
      });
      const fullBlob = result.blob;

      // Generate base filename (shared between full and thumb)
      const baseName =
        fileName?.replace(/\.webp$/, '') ||
        `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const fullPath = `marketplace/${baseName}.webp`;
      const thumbPath = `marketplace/${baseName}-thumb.webp`;

      // Generate the thumbnail (non-blocking — failure is non-fatal)
      const thumbnailBlob = await generateThumbnail(fullBlob).catch((err) => {
        logger.warn('Thumbnail generation failed (non-fatal):', err);
        return null;
      });

      // Upload full image and thumbnail in parallel
      const [fullUpload, thumbUpload] = await Promise.all([
        supabase.storage
          .from('sticker-images')
          .upload(fullPath, fullBlob, { contentType: 'image/webp', upsert: true }),
        thumbnailBlob
          ? supabase.storage
              .from('sticker-images')
              .upload(thumbPath, thumbnailBlob, { contentType: 'image/webp', upsert: true })
          : Promise.resolve({ error: new Error('Thumbnail skipped') }),
      ]);

      if (fullUpload.error) throw fullUpload.error;

      // Resolve public URLs
      const { data: { publicUrl: imageUrl } } = supabase.storage
        .from('sticker-images')
        .getPublicUrl(fullPath);

      const thumbnailUrl =
        thumbUpload.error || !thumbnailBlob
          ? null
          : supabase.storage.from('sticker-images').getPublicUrl(thumbPath).data.publicUrl;

      onChange(imageUrl, thumbnailUrl);
      toast.success('Imagen subida con éxito');
    } catch (error) {
      logger.error('Upload error:', error);
      const message =
        error instanceof Error ? error.message : 'Error al subir la imagen';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (blob: Blob, fileName: string) => {
    await uploadImage(blob, fileName);
  };

  const handleRemove = () => {
    onChange(null, null);
  };

  return (
    <>
      <div className="space-y-4">
        {value ? (
          <div className="relative">
            <ModernCard className="bg-white dark:bg-gray-800">
              <ModernCardContent className="p-0">
                <div className="relative min-h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                  <Image
                    src={value}
                    alt="Vista previa del anuncio"
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-contain"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={handleRemove}
                    aria-label="Eliminar imagen"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        ) : (
          <ModernCard>
            <ModernCardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gray-50 border-2 border-black flex items-center justify-center" aria-hidden="true">
                  <ImageIcon className="h-8 w-8 text-gray-600" />
                </div>
                <div className="text-center">
                  <p className="text-gray-900 font-bold mb-2">Añadir Imagen</p>
                  <p className="text-gray-600 text-sm mb-4">
                    Sube una foto de tu cromo para mayor visibilidad
                  </p>
                  <div className="flex gap-2 justify-center">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <Button
                        type="button"
                        aria-label={uploading ? 'Subiendo imagen' : 'Elegir imagen'}
                        disabled={uploading}
                        className="bg-gold text-black hover:bg-gold-light font-bold"
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-black border-r-transparent rounded-full mr-2" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                            Elegir
                          </>
                        )}
                      </Button>
                    </div>
                    {supportsCamera && (
                      <Button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        disabled={uploading}
                        variant="outline"
                        className="border-2 border-gold text-gold hover:bg-gold hover:text-black"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Cámara
                      </Button>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    JPG, PNG o WebP (máx. 5MB)
                  </p>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        )}
      </div>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </>
  );
}
