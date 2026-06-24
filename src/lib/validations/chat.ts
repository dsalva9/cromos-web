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
