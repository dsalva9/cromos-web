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
  // Use object URL instead of data URL to avoid base64 encoding overhead
  const objectUrl = URL.createObjectURL(file);

  return new Promise<EnsureSquareResult>((resolve, reject) => {
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    const img = new window.Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          cleanup();
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

        cleanup();

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
        cleanup();
        reject(error);
      }
    };

    img.onerror = () => {
      cleanup();
      reject(
        new Error(
          `No se pudo cargar la imagen (type=${file.type}, size=${(file.size / 1024).toFixed(0)}KB)`
        )
      );
    };

    img.src = objectUrl;
  });
}
