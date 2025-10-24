/**
 * Process image before upload: resize, compress, and convert format
 * Used by both marketplace listings and avatar uploads
 */

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

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();

    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        reject(new Error('No se pudo leer el archivo'));
        return;
      }

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
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen'));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
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
