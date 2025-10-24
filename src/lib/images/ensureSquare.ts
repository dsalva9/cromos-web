/**
 * Ensures an image file is square by cropping/letterboxing
 * Uses HTML Canvas API to process the image client-side
 * Returns a blob with 512x512 max dimension and preserved transparency
 */

interface EnsureSquareResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function ensureSquare(
  file: File,
  maxDimension = 512
): Promise<EnsureSquareResult> {
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
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('No se pudo crear el contexto del canvas'));
            return;
          }

          // Determine final dimensions
          const size = Math.min(img.width, img.height, maxDimension);
          canvas.width = size;
          canvas.height = size;

          // Calculate crop/letterbox offsets to center the image
          const sourceSize = Math.min(img.width, img.height);
          const sourceX = (img.width - sourceSize) / 2;
          const sourceY = (img.height - sourceSize) / 2;

          // Draw image centered and cropped to square
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            size,
            size
          );

          // Convert to blob (preserve transparency with PNG)
          canvas.toBlob(
            blob => {
              if (!blob) {
                reject(new Error('No se pudo convertir el canvas a blob'));
                return;
              }

              resolve({
                blob,
                width: size,
                height: size,
              });
            },
            'image/png',
            0.95
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
