/**
 * Process image before upload: resize, compress, and convert format
 * Used by both marketplace listings and avatar uploads
 */

import jsQR from 'jsqr';


interface ProcessImageOptions {
  /** Maximum file size in MB (default: 2) */
  maxSizeMB?: number;
  /** Maximum width or height in pixels (default: 1600) */
  maxWidthOrHeight?: number;
  /** Convert to WebP format (default: true) */
  convertToWebP?: boolean;
  /** WebP quality 0-1 (default: 0.85) */
  quality?: number;
  /** Force square aspect ratio (default: false) */
  forceSquare?: boolean;
}

interface ProcessImageResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
}

export async function processImageBeforeUpload(
  file: File,
  options: ProcessImageOptions = {}
): Promise<ProcessImageResult> {
  const {
    maxSizeMB = 2,
    maxWidthOrHeight = 1600,
    convertToWebP = true,
    quality = 0.85,
    forceSquare = false,
  } = options;

  const originalSize = file.size;

  // Reject empty files early with a clear error
  if (originalSize === 0) {
    throw new Error(
      `La imagen está vacía (type=${file.type}, size=0KB). Intenta seleccionar otra imagen.`
    );
  }

  // Use object URL instead of data URL to avoid base64 encoding overhead
  // (data URLs are ~33% larger, which can cause OOM on low-memory Android devices)
  const objectUrl = URL.createObjectURL(file);
  let currentUrl = objectUrl;

  return new Promise<ProcessImageResult>((resolve, reject) => {
    const cleanup = () => {
      if (currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
    const img = new window.Image();

    img.onload = () => {
      try {
        let targetWidth = img.width;
        let targetHeight = img.height;

        // Apply square constraint if needed
        if (forceSquare) {
          const size = Math.min(img.width, img.height);
          targetWidth = size;
          targetHeight = size;
        }

        // Scale down if exceeds max dimension
        const maxDim = Math.max(targetWidth, targetHeight);
        if (maxDim > maxWidthOrHeight) {
          const scale = maxWidthOrHeight / maxDim;
          targetWidth = Math.round(targetWidth * scale);
          targetHeight = Math.round(targetHeight * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }

        // Handle square cropping
        if (forceSquare) {
          const sourceSize = Math.min(img.width, img.height);
          const sourceX = (img.width - sourceSize) / 2;
          const sourceY = (img.height - sourceSize) / 2;

          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            targetWidth,
            targetHeight
          );
        } else {
          // Standard resize
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }

        // Check for QR code in the image.
        // Exception: CambioCromos own trade-match QR codes are allowed.
        try {
          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const qrCode = jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            { inversionAttempts: 'dontInvert' }
          );

          if (qrCode) {
            const isOwnQR =
              qrCode.data.includes('cambiocromos.com/match/') ||
              qrCode.data.includes('localhost') && qrCode.data.includes('/match/');

            if (!isOwnQR) {
              cleanup();
              reject(
                new Error(
                  'Subida bloqueada: No se permiten códigos QR en las imágenes. / Upload blocked: QR codes are not allowed in listing images.'
                )
              );
              return;
            }
          }
        } catch (scanError) {
          // Log scan error but don't block uploads if the scanner fails unexpectedly
          console.error('Error scanning for QR code:', scanError);
        }

        cleanup();

        // Determine output format
        const outputFormat = convertToWebP ? 'image/webp' : file.type;

        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('No se pudo convertir el canvas a blob'));
              return;
            }

            const processedSize = blob.size;
            const sizeMB = processedSize / (1024 * 1024);

            // Check if result is within size limit
            if (sizeMB > maxSizeMB) {
              reject(
                new Error(
                  `La imagen procesada (${sizeMB.toFixed(1)}MB) excede el límite de ${maxSizeMB}MB`
                )
              );
              return;
            }

            resolve({
              blob,
              width: targetWidth,
              height: targetHeight,
              originalSize,
              processedSize,
            });
          },
          outputFormat,
          quality
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    img.onerror = () => {
      if (currentUrl.startsWith('blob:')) {
        // Fallback to FileReader data URL
        cleanup();
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result;
          if (typeof dataUrl === 'string') {
            currentUrl = dataUrl;
            img.src = dataUrl;
          } else {
            reject(
              new Error(
                `No se pudo cargar la imagen (type=${file.type}, size=${(file.size / 1024).toFixed(0)}KB)`
              )
            );
          }
        };
        reader.onerror = () => {
          reject(
            new Error(
              `No se pudo cargar la imagen (type=${file.type}, size=${(file.size / 1024).toFixed(0)}KB)`
            )
          );
        };
        reader.readAsDataURL(file);
      } else {
        reject(
          new Error(
            `No se pudo cargar la imagen (type=${file.type}, size=${(file.size / 1024).toFixed(0)}KB)`
          )
        );
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Helper to convert File to processed Blob with options
 */
export async function fileToProcessedBlob(
  file: File,
  options?: ProcessImageOptions
): Promise<Blob> {
  const result = await processImageBeforeUpload(file, options);
  return result.blob;
}

/**
 * Generate a WebP thumbnail from any Blob/File.
 * Always resizes to at most `maxWidth` pixels wide, preserving aspect ratio.
 * Skips the size-limit guard — thumbnails are expected to be small.
 *
 * @param source  - Source image (File or Blob)
 * @param maxWidth - Maximum thumbnail width in pixels (default: 400)
 * @param quality  - WebP quality 0-1 (default: 0.75)
 */
export async function generateThumbnail(
  source: File | Blob,
  maxWidth = 400,
  quality = 0.75
): Promise<Blob> {
  const file =
    source instanceof File
      ? source
      : new File([source], 'thumb.webp', { type: source.type || 'image/webp' });

  const objectUrl = URL.createObjectURL(file);
  let currentUrl = objectUrl;

  return new Promise<Blob>((resolve, reject) => {
    const cleanup = () => {
      if (currentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentUrl);
      }
    };
    const img = new window.Image();

    img.onload = () => {
      try {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetWidth = Math.round(img.width * scale);
        const targetHeight = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        cleanup();

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('No se pudo generar el thumbnail'));
              return;
            }
            resolve(blob);
          },
          'image/webp',
          quality
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    img.onerror = () => {
      if (currentUrl.startsWith('blob:')) {
        // Fallback to FileReader data URL
        cleanup();
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result;
          if (typeof dataUrl === 'string') {
            currentUrl = dataUrl;
            img.src = dataUrl;
          } else {
            reject(new Error('No se pudo cargar la imagen para el thumbnail'));
          }
        };
        reader.onerror = () => {
          reject(new Error('No se pudo cargar la imagen para el thumbnail'));
        };
        reader.readAsDataURL(file);
      } else {
        reject(new Error('No se pudo cargar la imagen para el thumbnail'));
      }
    };

    img.src = objectUrl;
  });
}

/**
 * Helper to check if an error is due to a QR code being detected
 */
export function isQRCodeError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    return error.message.includes('QR') || error.message.includes('código QR');
  }
  if (typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message.includes('QR') || (error as any).message.includes('código QR');
  }
  if (typeof error === 'string') {
    return error.includes('QR') || error.includes('código QR');
  }
  return false;
}

