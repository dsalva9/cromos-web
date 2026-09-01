import { isNative } from '@/lib/platform';
import { logger } from '@/lib/logger';

// ── Cooldown Configuration ──────────────────────────────────────────────────
// Minimum time between in-app review requests (7 days)
const REVIEW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_KEY_LAST_REQUEST = 'app_review_last_requested_at';

export interface TriggerReviewOptions {
  /** Optional delay in milliseconds before launching the dialog (default: 800ms) */
  delayMs?: number;
  /** Force prompt ignoring cooldown (useful for debugging/testing) */
  force?: boolean;
}

/**
 * Returns the timestamp of the last review request from localStorage.
 */
function getLastReviewRequestTime(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(STORAGE_KEY_LAST_REQUEST);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Saves the current timestamp as the last review request time.
 */
function setLastReviewRequestTime(timestamp: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LAST_REQUEST, String(timestamp));
  } catch {
    // Ignore localStorage write errors
  }
}

/**
 * Prompts the user for an in-app review using Google Play In-App Review API (Android)
 * or SKStoreReviewController (iOS) via @capacitor-community/in-app-review.
 *
 * Safety & Behavior:
 * - Only runs inside the Capacitor native app (guarded by isNative()).
 * - Safely does nothing on Web, PWA, or SSR.
 * - Enforces a 7-day cooldown between prompts to respect user experience and store guidelines.
 * - Executes asynchronously after a brief delay so UI transitions and toasts render smoothly.
 * - Never throws or interrupts user actions.
 *
 * @param reason - Identifier for analytics/logging (e.g., 'trade_confirmed', 'page_completed', 'album_100_percent')
 * @param options - Optional configuration (delayMs, force)
 * @returns Promise<boolean> - True if the review was requested from the OS, false if skipped or failed.
 */
export async function triggerInAppReview(
  reason: string,
  options?: TriggerReviewOptions
): Promise<boolean> {
  // 1. Guard: Only run in native Capacitor app shell
  if (!isNative()) {
    return false;
  }

  const { delayMs = 800, force = false } = options || {};

  // 2. Guard: Check cooldown unless force is true
  if (!force) {
    const lastRequest = getLastReviewRequestTime();
    const elapsed = Date.now() - lastRequest;

    if (lastRequest > 0 && elapsed < REVIEW_COOLDOWN_MS) {
      logger.debug(
        `[InAppReview] Skipped: cooldown active (${Math.round(elapsed / (1000 * 60 * 60 * 24))}d elapsed < 7d required). Reason: ${reason}`
      );
      return false;
    }
  }

  // 3. Optional delay so success animations/toasts finish rendering smoothly
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // 4. Request native review dialog
  try {
    logger.info(`[InAppReview] Triggering review dialog. Reason: ${reason}`);
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
    
    // Update cooldown timestamp
    setLastReviewRequestTime(Date.now());
    return true;
  } catch (error) {
    logger.warn('[InAppReview] Failed to request in-app review:', error);
    return false;
  }
}
