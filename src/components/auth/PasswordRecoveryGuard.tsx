'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';
import { isTransientNetworkError } from '@/lib/supabase/notifications';

/**
 * The Supabase Session type doesn't include `amr`, but it's present at runtime
 * when authentication includes recovery/OTP flows. This augments the type safely.
 */
interface AMREntry {
  method: string;
  timestamp: number;
}

interface SessionWithAMR {
  amr?: AMREntry[];
}

const RESET_PASSWORD_ROUTE = '/profile/reset-password';
const RECOVERY_FLAG_KEY = 'password_recovery_required';

interface PasswordRecoveryGuardProps {
  children: React.ReactNode;
}

export function PasswordRecoveryGuard({ children }: PasswordRecoveryGuardProps) {
  const supabase = useSupabaseClient();
  const pathname = usePathname();

  useEffect(() => {
    const checkRecoveryState = async () => {
      try {
        // Check if there's a recovery flag in session storage
        const recoveryRequired = sessionStorage.getItem(RECOVERY_FLAG_KEY);

        if (recoveryRequired === 'true' && pathname !== RESET_PASSWORD_ROUTE) {
          logger.info('Password recovery required, redirecting to reset page');
          // Hard redirect — router.replace gets stuck due to Next.js 16 transition bug
          window.location.href = RESET_PASSWORD_ROUTE;
          return;
        }

        // Also check if user has a recovery session (AMR contains 'otp')
        // This catches cases where the flag hasn't been set yet
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // AMR (Authentication Method Reference) is on the session at runtime
          const amr = (session as unknown as SessionWithAMR).amr ?? [];
          const hasRecoveryAuth = amr.some((item) => item.method === 'otp');

          if (hasRecoveryAuth && pathname !== RESET_PASSWORD_ROUTE) {
            if (recoveryRequired !== 'true') {
              sessionStorage.setItem(RECOVERY_FLAG_KEY, 'true');
            }
            logger.info('Recovery session detected via AMR, redirecting to reset page');
            // Hard redirect — router.replace gets stuck due to Next.js 16 transition bug
            window.location.href = RESET_PASSWORD_ROUTE;
            return;
          }
        }
      } catch (error) {
        if (isTransientNetworkError(error)) {
          logger.info('Recovery state check aborted (navigation):', error);
        } else {
          logger.error('Error checking recovery state:', error);
        }
      }
    };

    checkRecoveryState();
  }, [supabase, pathname]);

  // Always render children — redirect happens as a side effect above.
  // This is critical for SSR: blocking render with `return null` would
  // prevent server-rendered page content from appearing in the initial HTML.
  return <>{children}</>;
}

// Helper function to clear the recovery flag after password reset
export function clearPasswordRecoveryFlag() {
  sessionStorage.removeItem(RECOVERY_FLAG_KEY);
  logger.info('Password recovery flag cleared');
}
