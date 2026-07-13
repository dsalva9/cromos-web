'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Upload, X, Image as ImageIcon, Camera, QrCode } from 'lucide-react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { CameraCaptureModal } from '@/components/marketplace/CameraCaptureModal';
import { processImageBeforeUpload, generateThumbnail, isQRCodeError } from '@/lib/images/processImageBeforeUpload';
import type { QRGenerationData } from '@/components/marketplace/SimplifiedListingForm';
import QRCode from 'qrcode';
import { siteConfig } from '@/config/site';
import { useTranslations } from 'next-intl';

interface ImageUploadProps {
  value?: string | null;
  /**
   * Called after upload completes.
   * @param imageUrl     - Public URL of the full-size image (marketplace/{id}.webp)
   * @param thumbnailUrl - Public URL of the 400px thumbnail (marketplace/{id}-thumb.webp),
   *                       or null if the thumbnail upload failed (non-fatal)
   */
  onChange: (imageUrl: string | null, thumbnailUrl?: string | null) => void;
  /** When provided, shows a "Generate QR" button to use a trade QR as the listing image */
  qrData?: QRGenerationData;
}

export function ImageUpload({ value, onChange, qrData }: ImageUploadProps) {
  const supabase = useSupabaseClient();
  const [uploading, setUploading] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [supportsCamera] = useState(() =>
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices
  );
  const tCreate = useTranslations('createListing');

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
      if (isQRCodeError(error)) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Subida bloqueada: No se permiten códigos QR en las imágenes.'
        );
      } else {
        logger.error('Upload error:', error);
        const message =
          error instanceof Error ? error.message : 'Error al subir la imagen';
        toast.error(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (blob: Blob, fileName: string) => {
    await uploadImage(blob, fileName);
  };

  /**
   * Generate a trade-match QR code on a canvas, convert to PNG blob, and upload it
   * as the listing image. Since the QR encodes a cambiocromos.com/match/ URL,
   * it passes through the QR blocker allowlist.
   */
  const handleGenerateQR = useCallback(async () => {
    if (!qrData) return;
    setGeneratingQR(true);
    try {
      const qrUrl = `${siteConfig.url}/match/${qrData.userId}/${qrData.copyId}?name=${encodeURIComponent(qrData.nickname)}&album=${encodeURIComponent(qrData.copyTitle)}`;

      // Generate QR on an offscreen canvas
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, qrUrl, {
        width: 512,
        margin: 3,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });

      // Convert canvas to PNG blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create QR blob'))),
          'image/png',
          1
        );
      });

      // Create a File from the blob and upload using the normal upload flow
      const fileName = `qr-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      await uploadImage(blob, fileName);
    } catch (err) {
      logger.error('QR generation failed:', err);
      toast.error(tCreate('qrGenerateError'));
    } finally {
      setGeneratingQR(false);
    }
  }, [qrData, uploadImage, tCreate]);

  const handleRemove = () => {
    onChange(null, null);
  };

  const isDisabled = uploading || generatingQR;

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
                    disabled={isDisabled}
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
                  <div className="flex gap-2 justify-center flex-wrap">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={isDisabled}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <Button
                        type="button"
                        aria-label={uploading ? 'Subiendo imagen' : 'Elegir imagen'}
                        disabled={isDisabled}
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
                        disabled={isDisabled}
                        variant="outline"
                        className="border-2 border-gold text-gold hover:bg-gold hover:text-black"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Cámara
                      </Button>
                    )}
                    {qrData && (
                      <Button
                        type="button"
                        onClick={handleGenerateQR}
                        disabled={isDisabled}
                        variant="outline"
                        className="border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
                      >
                        {generatingQR ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-r-transparent rounded-full mr-2" />
                            {tCreate('qrGenerating')}
                          </>
                        ) : (
                          <>
                            <QrCode className="h-4 w-4 mr-2" />
                            QR
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    {qrData
                      ? tCreate('imageHintWithQR')
                      : 'JPG, PNG o WebP (máx. 5MB)'}
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
