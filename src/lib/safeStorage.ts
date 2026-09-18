/**
 * Safe wrapper around `window.localStorage` for environments where
 * storage may be `null` or throw (Safari Private Browsing, blocked
 * cookies, partitioned webviews, etc.).
 *
 * Use this instead of accessing `localStorage` directly in any code
 * that could run during React render or in user-facing callbacks.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      // QuotaExceededError, SecurityError — silently ignore
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage?.removeItem(key);
    } catch {
      // SecurityError — silently ignore
    }
  },
};
