'use client';


import { siteConfig } from '@/config/site';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { getSupportMailtoUrl } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { GoogleIcon } from '@/components/ui/google-icon';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/lib/logger';
import { mapSupabaseError } from '@/lib/auth/auth-errors';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClientError, setIsClientError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const t = useTranslations('auth.signup');
  const tErrors = useTranslations('auth.errors');
  const termsErrorMessage = t('termsError');
  const supabase = useSupabaseClient();

  const MIN_PASSWORD_LENGTH = 6;

  // Handle countdown for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleTermsToggle = (value: boolean | 'indeterminate') => {
    const nextValue = value === true;
    setTermsAccepted(nextValue);
    if (nextValue && error === termsErrorMessage) {
      setError('');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      setIsClientError(true);
      setError(termsErrorMessage);
      return;
    }

    if (password !== confirmPassword) {
      setIsClientError(true);
      setError(t('passwordMatchError'));
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setIsClientError(true);
      setError(t('passwordTooShortHint'));
      return;
    }

    setIsClientError(false);
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const trimmedEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const mappedKey = mapSupabaseError(error.message);
        setError(mappedKey || error.message);
      } else {
        // Log information about signup success
        logger.debug('Signup initial success response:', data);
        setSuccess(true);
      }
    } catch (err) {
      logger.error('Unexpected error in signup:', err);
      setError('unexpected');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative
        ? 'com.cambiocromos.app://auth/callback'
        : `${window.location.origin}/auth/callback`;

      logger.debug('Google signup redirect TO:', redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        const mappedKey = mapSupabaseError(error.message);
        setError(mappedKey || error.message);
        setLoading(false);
      }
    } catch (err) {
      logger.error('Unexpected error in Google signup:', err);
      setError('googleUnexpected');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const mappedKey = mapSupabaseError(error.message);
        setError(mappedKey || error.message);
      } else {
        setResendCooldown(60);
        setResendMessage(t('resendSuccess'));
      }
    } catch (err) {
      logger.error('Unexpected error in resend:', err);
      setError('unexpected');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-gold rounded-md mx-auto mb-4 flex items-center justify-center text-4xl border-2 border-black shadow-xl">
            📧
          </div>
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            {t('successTitle')}
          </h1>
        </div>

        {/* Success Card */}
        <div className="w-full max-w-md bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h2 className="text-xl font-black uppercase text-gray-900 dark:text-white mb-2">
                {t('successSubtitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {t('successSent')}{' '}
                <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {t('successInstruction')}
              </p>

              <Link href="/login">
                <Button className="w-full bg-gold hover:bg-yellow-400 text-gray-900 font-black uppercase py-3 rounded-md shadow-xl border-2 border-black transition-all duration-200">
                  {t('successLogin')}
                </Button>
              </Link>

              <Button
                variant="outline"
                className="w-full bg-white dark:bg-gray-750 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold py-3 rounded-md shadow-lg border-2 border-black transition-all duration-200 text-sm"
                onClick={handleResend}
                disabled={resendCooldown > 0 || resending}
              >
                {resendCooldown > 0
                  ? t('resendCooldown', { seconds: resendCooldown })
                  : t('resendButton')}
              </Button>

              {resendMessage && (
                <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-2">
                  {resendMessage}
                </p>
              )}

              {error && !isClientError && (
                <div className="bg-[#E84D4D] border-2 border-black rounded-md p-3 mt-2">
                  <p className="text-xs text-white font-bold">
                    {tErrors.has(error) ? tErrors(error) : error}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                {t('successHint')}
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-bold hover:underline"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
      {/* Logo/Header */}
      <div className="mb-8 text-center">
        <div className="relative w-48 h-48 mx-auto mb-4">
          <Image
            src="/assets/LogoBlanco.png"
            alt="Logo"
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>
        <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
          {siteConfig.name}
        </h1>
      </div>

      {/* Signup Card */}
      <div className="w-full max-w-md bg-white dark:bg-gray-800 border-2 border-black rounded-md shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white mb-2">
              {t('title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {t('subtitle')}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-bold uppercase text-gray-900 dark:text-white"
              >
                {t('emailLabel')}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="rounded-md bg-gray-50 dark:bg-gray-900 border-2 border-black text-gray-900 dark:text-white placeholder-gray-400 focus:border-gold focus:ring-gold"
              />
            </div>            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-bold uppercase text-gray-900 dark:text-white"
              >
                {t('passwordLabel')}
              </label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="rounded-md bg-gray-50 dark:bg-gray-900 border-2 border-black text-gray-900 dark:text-white placeholder-gray-400 focus:border-gold focus:ring-gold"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('passwordHint')}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-bold uppercase text-gray-900 dark:text-white"
              >
                {t('confirmPasswordLabel')}
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="rounded-md bg-gray-50 dark:bg-gray-900 border-2 border-black text-gray-900 dark:text-white placeholder-gray-400 focus:border-gold focus:ring-gold"
              />
            </div>

            <div className="rounded-md border-2 border-black bg-gray-50 dark:bg-gray-900 px-4 py-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={handleTermsToggle}
                  className="mt-1"
                  aria-describedby="terms-helper"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  <label
                    htmlFor="terms"
                    className="font-medium text-gray-900 dark:text-white cursor-pointer select-none"
                  >
                    {t('termsLabel')}
                  </label>
                  <p id="terms-helper" className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {t('termsHelperPre')}{' '}
                    <Link
                      href="/legal/terms"
                      target="_blank"
                      className="font-semibold text-gold hover:text-yellow-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
                    >
                      {t('termsLink')}
                    </Link>{' '}
                    {t('termsAnd')}{' '}
                    <Link
                      href="/legal/privacy"
                      target="_blank"
                      className="font-semibold text-gold hover:text-yellow-400 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-sm"
                    >
                      {t('privacyLink')}
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-[#E84D4D] border-2 border-black rounded-md p-4">
                <p className="text-sm text-white font-bold">
                  {tErrors.has(error) ? tErrors(error) : error}
                </p>
                {!isClientError && (
                  <p className="text-sm text-white font-bold mt-2">
                    {tErrors('contactSupport')}{' '}
                    <a
                      href={getSupportMailtoUrl()}
                      className="underline hover:text-gray-200"
                    >
                      soporte@cambiocromos.com
                    </a>
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gold hover:bg-yellow-400 text-gray-900 font-black uppercase py-3 rounded-md shadow-xl border-2 border-black transition-all duration-200"
              disabled={loading}
            >
              {loading ? t('loading') : t('submitButton')}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-gray-200 dark:border-gray-700"></span>
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-white dark:bg-gray-800 px-4 text-gray-500 font-bold text-xs">{t('or')}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold h-10 sm:py-3 rounded-md shadow-lg border-2 border-black flex items-center justify-center gap-3 transition-all duration-200 text-sm"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t('googleButton')}</span>
          </Button>

          <div className="mt-8 text-center">
            <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {t('hasAccount')}{' '}
                <Link
                  href="/login"
                  className="text-gold hover:text-yellow-400 font-bold hover:underline"
                >
                  {t('loginLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Home */}
      <div className="mt-8">
        <Link
          href="/"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-bold hover:underline"
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  );
}



