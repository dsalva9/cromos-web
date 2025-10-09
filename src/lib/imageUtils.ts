/**
 * Image utilities for WebP conversion and resizing
 * Used by admin backoffice for sticker image management
 */

import { logger } from '@/lib/logger';

export interface ImageConversionOptions {
  maxDimension: number; // Max width or height (preserves aspect ratio)
  quality: number; // 0-1 (0.8 = 80%)
  format?: 'webp' | 'png' | 'jpeg';
}

export interface ConversionResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  convertedSize: number;
}

/**
 * Convert an image file to WebP format with resizing
 * @param file - Original image file
 * @param options - Conversion options
 * @returns Promise<ConversionResult>
 */
export async function convertImageToWebP(
  file: File,
  options: ImageConversionOptions
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate dimensions (preserve aspect ratio, don't upscale)
          const { width: originalWidth, height: originalHeight } = img;
          let targetWidth = originalWidth;
          let targetHeight = originalHeight;

          const maxDim = Math.max(originalWidth, originalHeight);

          if (maxDim > options.maxDimension) {
            const scale = options.maxDimension / maxDim;
            targetWidth = Math.round(originalWidth * scale);
            targetHeight = Math.round(originalHeight * scale);
          }

          logger.info('Converting image', {
            original: { width: originalWidth, height: originalHeight },
            target: { width: targetWidth, height: targetHeight },
            maxDimension: options.maxDimension,
          });

          // Create canvas and draw scaled image
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Use high-quality image scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw image to canvas
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to convert image to blob'));
                return;
              }

              // Create data URL for preview
              const dataUrl = canvas.toDataURL(
                `image/${options.format || 'webp'}`,
                options.quality
              );

              logger.info('Image conversion complete', {
                originalSize: file.size,
                convertedSize: blob.size,
                ratio: (blob.size / file.size).toFixed(2),
              });

              resolve({
                blob,
                dataUrl,
                width: targetWidth,
                height: targetHeight,
                originalSize: file.size,
                convertedSize: blob.size,
              });
            },
            `image/${options.format || 'webp'}`,
            options.quality
          );
        } catch (error) {
          logger.error('Error during image conversion', { error });
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert image to full-size WebP (300px max dimension)
 */
export async function convertToFullWebP(file: File): Promise<ConversionResult> {
  return convertImageToWebP(file, {
    maxDimension: 300,
    quality: 0.82,
    format: 'webp',
  });
}

/**
 * Convert image to thumbnail WebP (100px max dimension)
 */
export async function convertToThumbWebP(file: File): Promise<ConversionResult> {
  return convertImageToWebP(file, {
    maxDimension: 100,
    quality: 0.8,
    format: 'webp',
  });
}

/**
 * Validate image file (type and size)
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo inválido. Se permiten: PNG, JPG, WebP`,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Archivo demasiado grande. Máximo: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Create a File object from a Blob
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}
