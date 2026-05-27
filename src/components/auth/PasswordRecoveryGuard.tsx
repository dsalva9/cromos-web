'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
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

/** Extract the locale prefix (e.g. '/es') from a pathname, or '' if none. */
function getLocalePrefix(path: string): string {
  const match = path.match(/^\/(es|en|pt)(?=\/|$)/);
  return match ? `/${match[1]}` : '';
}

/**
 * Suppress `useLayoutEffect` SSR warning — on the server we fall back to
 * `useEffect` (the blocking check only matters on the client anyway).
 */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface PasswordRecoveryGuardProps {
  children: React.ReactNode;
}

/**
 * PasswordRecoveryGuard — blocks navigation away from the reset-password page
 * while a password-recovery session is active.
 *
 * Uses `useLayoutEffect` for the synchronous sessionStorage check so the
 * destination page content is never painted when the user tries to navigate away.
 * An additional `useEffect` runs an async AMR check as a fallback for cases
 * where the sessionStorage flag hasn't been set yet.
 */
export function PasswordRecoveryGuard({ children }: PasswordRecoveryGuardProps) {
  const supabase = useSupabaseClient();
  const pathname = usePathname();

  /**
   * `blocked` controls whether children are rendered.  Initialised to `false`
   * so the server-rendered HTML always includes children (avoids hydration
   * mismatch).  `useLayoutEffect` sets it to `true` synchronously before the
   * browser paints when a redirect is needed.
   */
  const [blocked, setBlocked] = useState(false);

  // ── Synchronous check (fires before browser paint) ───────────────────
  useIsomorphicLayoutEffect(() => {
    const isOnResetPage = pathname?.endsWith(RESET_PASSWORD_ROUTE) ?? false;

    let recoveryRequired = false;
    try {
      recoveryRequired = sessionStorage.getItem(RECOVERY_FLAG_KEY) === 'true';
    } catch {
      /* SSR or storage unavailable */
    }

    if (recoveryRequired && !isOnResetPage) {
      setBlocked(true);
      const localePrefix = getLocalePrefix(pathname);
      logger.info('Password recovery required, redirecting to reset page');
      window.location.href = `${localePrefix}${RESET_PASSWORD_ROUTE}`;
    } else {
      setBlocked(false);
    }
  }, [pathname]);

  // ── Async AMR fallback ───────────────────────────────────────────────
  // Catches cases where the sessionStorage flag hasn't been set yet but
  // the Supabase session contains a recovery AMR entry.
  useEffect(() => {
    const checkAMR = async () => {
      try {
        const isOnResetPage = pathname?.endsWith(RESET_PASSWORD_ROUTE) ?? false;
        if (isOnResetPage) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const amr = (session as unknown as SessionWithAMR).amr ?? [];
        const hasRecoveryAuth = amr.some((item) => item.method === 'otp');

        if (hasRecoveryAuth) {
          try {
            sessionStorage.setItem(RECOVERY_FLAG_KEY, 'true');
          } catch {
            /* storage unavailable */
          }
          setBlocked(true);
          const localePrefix = getLocalePrefix(pathname);
          logger.info(
            'Recovery session detected via AMR, redirecting to reset page'
          );
          window.location.href = `${localePrefix}${RESET_PASSWORD_ROUTE}`;
        }
      } catch (error) {
        if (isTransientNetworkError(error)) {
          logger.info('Recovery state check aborted (navigation):', error);
        } else {
          logger.error('Error checking recovery state:', error);
        }
      }
    };

    checkAMR();
  }, [supabase, pathname]);

  // ── Render ───────────────────────────────────────────────────────────
  // When blocked, render a minimal placeholder instead of children.
  // A placeholder (not `null`) avoids corrupting Next.js router state.
  if (blocked) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
          Redireccionando…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

// Helper function to clear the recovery flag after password reset
export function clearPasswordRecoveryFlag() {
  try {
    sessionStorage.removeItem(RECOVERY_FLAG_KEY);
  } catch {
    /* storage unavailable */
  }
  logger.info('Password recovery flag cleared');
}
