import { useCallback } from 'react';
import { triggerInAppReview, TriggerReviewOptions } from '@/lib/inAppReview';

/**
 * Hook to trigger in-app reviews in moments of high user satisfaction.
 */
export function useInAppReview() {
  const requestReview = useCallback(
    (reason: string, options?: TriggerReviewOptions) => {
      // Fire-and-forget without blocking UI execution
      void triggerInAppReview(reason, options);
    },
    []
  );

  return { requestReview };
}
