'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

const RESET_PASSWORD_ROUTE = '/profile/reset-password';
const RECOVERY_FLAG_KEY = 'password_recovery_required';

interface PasswordRecoveryGuardProps {
  children: React.ReactNode;
}

export function PasswordRecoveryGuard({ children }: PasswordRecoveryGuardProps) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRecoveryState = async () => {
      try {
        // Check if there's a recovery flag in session storage
        const recoveryRequired = sessionStorage.getItem(RECOVERY_FLAG_KEY);

        console.log('[PasswordRecoveryGuard] Checking recovery state:', {
          recoveryRequired,
          pathname,
          shouldRedirect: recoveryRequired === 'true' && pathname !== RESET_PASSWORD_ROUTE
        });

        if (recoveryRequired === 'true' && pathname !== RESET_PASSWORD_ROUTE) {
          logger.info('Password recovery required, redirecting to reset page');
          console.log('[PasswordRecoveryGuard] Redirecting to:', RESET_PASSWORD_ROUTE);
          router.replace(RESET_PASSWORD_ROUTE);
          return;
        }

        // Also check if user has a recovery session (AMR contains 'otp')
        // This catches cases where the flag hasn't been set yet
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // AMR (Authentication Method Reference) is on the session, not the user
          const amr = (session as any).amr || [];
          const hasRecoveryAuth = amr.some((item: any) => item.method === 'otp');

          if (hasRecoveryAuth && pathname !== RESET_PASSWORD_ROUTE) {
            // Set the flag if it's not set yet
            if (recoveryRequired !== 'true') {
              sessionStorage.setItem(RECOVERY_FLAG_KEY, 'true');
            }
            logger.info('Recovery session detected via AMR, redirecting to reset page');
            console.log('[PasswordRecoveryGuard] Recovery session detected, redirecting to:', RESET_PASSWORD_ROUTE);
            router.replace(RESET_PASSWORD_ROUTE);
            return;
          }
        }
      } catch (error) {
        logger.error('Error checking recovery state:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkRecoveryState();
  }, [supabase, router, pathname]);

  // Don't render children while checking
  if (isChecking && pathname !== RESET_PASSWORD_ROUTE) {
    return null;
  }

  return <>{children}</>;
}

// Helper function to clear the recovery flag after password reset
export function clearPasswordRecoveryFlag() {
  sessionStorage.removeItem(RECOVERY_FLAG_KEY);
  logger.info('Password recovery flag cleared');
}
