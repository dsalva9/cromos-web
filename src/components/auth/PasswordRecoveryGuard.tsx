'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

const RESET_PASSWORD_ROUTE = '/profile/reset-password';
const RECOVERY_FLAG_KEY = 'password_recovery_required';

interface PasswordRecoveryGuardProps {
  children: React.ReactNode;
}

export function PasswordRecoveryGuard({ children }: PasswordRecoveryGuardProps) {
  const { supabase } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRecoveryState = async () => {
      try {
        // Check if there's a recovery flag in session storage
        const recoveryRequired = sessionStorage.getItem(RECOVERY_FLAG_KEY);

        if (recoveryRequired === 'true' && pathname !== RESET_PASSWORD_ROUTE) {
          logger.info('Password recovery required, redirecting to reset page');
          router.replace(RESET_PASSWORD_ROUTE);
          return;
        }

        // The recovery flag is the primary indicator
        // No need to check AMR as the flag is set during the callback
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
