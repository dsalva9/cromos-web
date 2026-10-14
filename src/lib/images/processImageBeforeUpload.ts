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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Encode canvas to Blob with automatic JPEG fallback when WebP canvas encoding
 * is unsupported (e.g. iOS Safari / WebKit, where canvas.toBlob('image/webp')
 * silently falls back to uncompressed 'image/png', ignoring quality).
 */
async function encodeCanvasWithFallback(
  canvas: HTMLCanvasElement,
  preferredMime: string,
  quality: number
): Promise<Blob | null> {
  let blob = await canvasToBlob(canvas, preferredMime, quality);

  // If WebP was requested but the browser returned PNG (or null), re-encode as JPEG
  if (preferredMime === 'image/webp' && (!blob || blob.type !== 'image/webp')) {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  if (!blob) {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  return blob;
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
      void (async () => {
        try {
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;
          let targetWidth = naturalW;
          let targetHeight = naturalH;

          // Apply square constraint if needed
          if (forceSquare) {
            const size = Math.min(naturalW, naturalH);
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

          // Fill white background in case JPEG fallback is used on an image with transparency
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Handle square cropping
          if (forceSquare) {
            const sourceSize = Math.min(naturalW, naturalH);
            const sourceX = (naturalW - sourceSize) / 2;
            const sourceY = (naturalH - sourceSize) / 2;

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

            // Scan at full resolution with both normal and inverted attempts
            let qrCode = jsQR(
              imageData.data,
              imageData.width,
              imageData.height,
              { inversionAttempts: 'attemptBoth' }
            );

            // If not found at full res, try a center crop (QR might be small within a photo)
            if (!qrCode && targetWidth > 200 && targetHeight > 200) {
              const cropX = Math.floor(targetWidth * 0.15);
              const cropY = Math.floor(targetHeight * 0.15);
              const cropW = targetWidth - cropX * 2;
              const cropH = targetHeight - cropY * 2;
              const cropData = ctx.getImageData(cropX, cropY, cropW, cropH);
              qrCode = jsQR(
                cropData.data,
                cropData.width,
                cropData.height,
                { inversionAttempts: 'attemptBoth' }
              );
            }

            if (qrCode) {
              const data = qrCode.data;
              const isOwnQR = data.includes('cambiocromos.com/match/');

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
          } catch {
            // Don't block uploads if the QR scanner fails unexpectedly
          }

          cleanup();

          // Determine preferred output format
          const preferredFormat = convertToWebP ? 'image/webp' : (file.type || 'image/jpeg');

          let blob = await encodeCanvasWithFallback(canvas, preferredFormat, quality);
          if (!blob) {
            reject(new Error('No se pudo convertir el canvas a blob'));
            return;
          }

          const maxBytes = maxSizeMB * 1024 * 1024;
          const effectiveMime =
            blob.type === 'image/webp' || blob.type === 'image/jpeg'
              ? blob.type
              : 'image/jpeg';

          // Step 1: If still over maxSizeMB, progressively lower quality
          const qualitySteps = [0.72, 0.6, 0.48, 0.35].filter((q) => q < quality);
          for (const stepQuality of qualitySteps) {
            if (blob.size <= maxBytes) break;
            const smallerBlob = await canvasToBlob(canvas, effectiveMime, stepQuality);
            if (smallerBlob && smallerBlob.size < blob.size) {
              blob = smallerBlob;
            }
          }

          // Step 2: If still over maxSizeMB, progressively scale down canvas dimensions
          let finalWidth = targetWidth;
          let finalHeight = targetHeight;
          const scaleSteps = [0.75, 0.55];
          for (const scaleFactor of scaleSteps) {
            if (blob.size <= maxBytes) break;
            const scaledW = Math.max(1, Math.round(targetWidth * scaleFactor));
            const scaledH = Math.max(1, Math.round(targetHeight * scaleFactor));
            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = scaledW;
            scaledCanvas.height = scaledH;
            const scaledCtx = scaledCanvas.getContext('2d');
            if (scaledCtx) {
              scaledCtx.fillStyle = '#ffffff';
              scaledCtx.fillRect(0, 0, scaledW, scaledH);
              scaledCtx.drawImage(canvas, 0, 0, scaledW, scaledH);
              const smallerBlob = await canvasToBlob(scaledCanvas, effectiveMime, 0.6);
              if (smallerBlob && smallerBlob.size < blob.size) {
                blob = smallerBlob;
                finalWidth = scaledW;
                finalHeight = scaledH;
              }
            }
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
            width: finalWidth,
            height: finalHeight,
            originalSize,
            processedSize,
          });
        } catch (error) {
          cleanup();
          reject(error);
        }
      })();
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
 * Generate a WebP (or JPEG fallback on iOS) thumbnail from any Blob/File.
 * Always resizes to at most `maxWidth` pixels wide, preserving aspect ratio.
 * Skips the size-limit guard — thumbnails are expected to be small.
 *
 * @param source  - Source image (File or Blob)
 * @param maxWidth - Maximum thumbnail width in pixels (default: 400)
 * @param quality  - WebP/JPEG quality 0-1 (default: 0.75)
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
      void (async () => {
        try {
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;
          const scale = naturalW > maxWidth ? maxWidth / naturalW : 1;
          const targetWidth = Math.round(naturalW * scale);
          const targetHeight = Math.round(naturalH * scale);

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          cleanup();

          const blob = await encodeCanvasWithFallback(canvas, 'image/webp', quality);
          if (!blob) {
            reject(new Error('No se pudo generar el thumbnail'));
            return;
          }
          resolve(blob);
        } catch (error) {
          cleanup();
          reject(error);
        }
      })();
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
  if (typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    const msg = (error as { message: string }).message;
    return msg.includes('QR') || msg.includes('código QR');
  }
  if (typeof error === 'string') {
    return error.includes('QR') || error.includes('código QR');
  }
  return false;
}

