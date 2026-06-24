/**
 * Chat message validation utilities.
 * Used client-side for instant UX feedback before hitting the DB trigger.
 */

/**
 * Checks if a message contains a real URL pattern.
 * Matches: http://, https://, www.xxx.xxx, wa.me, t.me
 * Does NOT match: casual dots like "hello.world" or "e.g."
 */
const URL_PATTERN = /https?:\/\/|www\.[a-zA-Z0-9]|wa\.me|t\.me/i;

export function containsUrl(text: string): boolean {
  return URL_PATTERN.test(text);
}

/** Maximum PDF file size in bytes (2MB) */
export const MAX_PDF_SIZE_BYTES = 2 * 1024 * 1024;

/** Check if a File/Blob is a PDF based on MIME type */
export function isPdfFile(file: File | Blob): boolean {
  return file.type === 'application/pdf';
}

/**
 * Downloads a file client-side by fetching it as a Blob
 * to hide the raw source URL and force download.
 */
export async function downloadFile(url: string, defaultFilename: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch file');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // Fallback: open in new tab if CORS or other issues occur
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
