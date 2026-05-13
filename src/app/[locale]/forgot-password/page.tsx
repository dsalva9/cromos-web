'use client';

import { siteConfig } from '@/config/site';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { getSupportMailtoUrl } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = useSupabaseClient();
  const t = useTranslations('auth.forgotPassword');
  const tErrors = useTranslations('auth.errors');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile/reset-password`,
      });

      if (error) {
        setMessage({ type: 'error', text: `${error.message}\n\n${tErrors('contactSupport')} soporte@cambiocromos.com` });
      } else {
        setMessage({
          type: 'success',
          text: t('successMessage'),
        });
      }
    } catch (error) {
      logger.error('Password reset error:', error);
      setMessage({ type: 'error', text: `${tErrors('unexpected')}\n\n${tErrors('contactSupport')} soporte@cambiocromos.com` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
      {/* Logo/Header */}
      <div className="mb-2 text-center">
        <div className="relative w-24 h-24 sm:w-48 sm:h-48 mx-auto">
          <Image
            src="/assets/LogoBlanco.png"
            alt="Logo"
            fill
            className="object-contain drop-shadow-xl"
            priority
          />
        </div>
        <h1 className="text-xl sm:text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
          {siteConfig.name}
        </h1>
      </div>

      {/* Card */}
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

          <form onSubmit={handleResetPassword} className="space-y-6">
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
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-md bg-gray-50 dark:bg-gray-900 border-2 border-black text-gray-900 dark:text-white placeholder-gray-400 focus:border-gold focus:ring-gold"
              />
            </div>

            {message && (
              <div
                className={`border-2 border-black rounded-md p-4 ${message.type === 'success' ? 'bg-green-600' : 'bg-[#E84D4D]'
                  }`}
              >
                <p className="text-sm text-white font-bold whitespace-pre-line">
                  {message.text.split('soporte@cambiocromos.com').map((part, index, array) => (
                    index < array.length - 1 ? (
                      <span key={index}>
                        {part}
                        <a
                          href={getSupportMailtoUrl()}
                          className="underline hover:text-gray-200"
                        >
                          soporte@cambiocromos.com
                        </a>
                      </span>
                    ) : (
                      part
                    )
                  ))}
                </p>
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

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-gold hover:text-yellow-400 font-bold hover:underline"
            >
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
