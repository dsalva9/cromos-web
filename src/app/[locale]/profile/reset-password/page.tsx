'use client';

import { siteConfig } from '@/config/site';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import Link from '@/components/ui/link';
import { useRouter } from '@/hooks/use-router';
import { logger } from '@/lib/logger';

export default function ResetPasswordPage() {
  const t = useTranslations('resetPassword');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const supabase = useSupabaseClient();
  const router = useRouter();

  // Set recovery flag when page loads (user came from recovery link)
  useEffect(() => {
    // Check if user has a session and if they arrived here via recovery
    const checkAndSetRecoveryFlag = async () => {
      try {
        // Check for hash tokens in the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // If we have recovery tokens, set the session
        if (accessToken && type === 'recovery') {
          logger.debug('[ResetPassword] Found recovery tokens, setting session...');

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            logger.error('[ResetPassword] Error setting session:', error);
            setError(t('errors.noSession'));
            setCheckingSession(false);
            return;
          }

          if (data.session) {
            logger.debug('[ResetPassword] Session established successfully');
            sessionStorage.setItem('password_recovery_required', 'true');
            setCheckingSession(false);
            return;
          }
        }

        // If no hash tokens, check if there's already a session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          sessionStorage.setItem('password_recovery_required', 'true');
          logger.debug('[ResetPassword] Existing session found');
        } else {
          setError(t('errors.noSession'));
        }

        setCheckingSession(false);
      } catch (err) {
        logger.error('[ResetPassword] Exception:', err);
        setError(t('errors.processError'));
        setCheckingSession(false);
      }
    };

    checkAndSetRecoveryFlag();
  }, [supabase]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (password.length < 6) {
      setError(t('errors.minChars'));
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('errors.noMatch'));
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Clear the password recovery flag
        sessionStorage.removeItem('password_recovery_required');
        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (error) {
      logger.error('Reset password error:', error);
      setError(t('errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo/Header */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-gold rounded-md mx-auto mb-4 flex items-center justify-center text-4xl border-2 border-black shadow-xl">
          ⚽
        </div>
        <h1 className="text-3xl font-black uppercase text-gray-900 mb-2">
          {siteConfig.name}
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white border-2 border-black rounded-md shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase text-gray-900 mb-2">
              {t('title')}
            </h2>
            <p className="text-gray-700 font-medium">
              {t('description')}
            </p>
          </div>

          {checkingSession ? (
            <div className="bg-gray-100 border-2 border-black rounded-md p-6 text-center">
              <p className="text-gray-900 font-bold text-lg mb-2">
                {t('verifying')}
              </p>
              <p className="text-gray-700 text-sm">
                {t('wait')}
              </p>
            </div>
          ) : success ? (
            <div className="bg-green-600 border-2 border-black rounded-md p-6 text-center">
              <p className="text-white font-bold text-lg mb-2">
                {t('successTitle')}
              </p>
              <p className="text-white text-sm">
                {t('successDesc')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-bold uppercase text-gray-900"
                >{t('newPasswordLabel')}</label>

                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-md bg-gray-50 border-2 border-black text-gray-900 placeholder-gray-500 focus:border-gold focus:ring-gold"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-bold uppercase text-gray-900"
                >
                  {t('confirmPasswordLabel')}
                </label>

                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-md bg-gray-50 border-2 border-black text-gray-900 placeholder-gray-500 focus:border-gold focus:ring-gold"
                />
              </div>

              {error && (
                <div className="bg-[#E84D4D] border-2 border-black rounded-md p-4">
                  <p className="text-sm text-white font-bold">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gold hover:bg-yellow-400 text-gray-900 font-black uppercase py-3 rounded-md shadow-xl border-2 border-black transition-all duration-200"
                disabled={loading}
              >
                {loading ? t('submitting') : t('submitButton')}
              </Button>
            </form>
          )}

          {!success && !checkingSession && (
            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="text-gold hover:text-yellow-400 font-bold hover:underline"
              >
                {t('backToLogin')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
