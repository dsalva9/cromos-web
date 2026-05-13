import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import SiteHeader from '@/components/site-header';
import { Toaster } from 'sonner';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ProfileCompletionProvider } from '@/components/providers/ProfileCompletionProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { composeProviders } from '@/lib/composeProviders';
import { OneSignalProvider } from '@/components/providers/OneSignalProvider';
import { DeepLinkHandler } from '@/components/providers/DeepLinkHandler';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { FloatingActionBtn } from '@/components/navigation/FloatingActionBtn';
import { ProfileCompletionGuard } from '@/components/profile/ProfileCompletionGuard';
import { PasswordRecoveryGuard } from '@/components/auth/PasswordRecoveryGuard';
import { AccountDeletionBanner } from '@/components/deletion';
import { SiteFooter } from '@/components/layout/SiteFooter';
import PWASplashScreen from '@/components/pwa/PWASplashScreen';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';
import { NotificationPromptBanner } from '@/components/notifications/NotificationPromptBanner';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Compose all top-level providers into a single wrapper to reduce nesting depth.
 * Order matters: outermost provider is first in the array.
 */
const Providers = composeProviders([
  [SupabaseProvider],
  [QueryProvider],
  [ThemeProvider],
  [OneSignalProvider],
  [DeepLinkHandler],
  [ProfileCompletionProvider],
  [ErrorBoundary],
]);

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Locale-aware layout — contains all providers, header, footer, and UI shell.
 * The root layout (../layout.tsx) provides the minimal HTML skeleton.
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale — return 404 for invalid ones
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <NextIntlClientProvider locale={locale}>
      <Providers>
        <PWASplashScreen>
          <Analytics />
          <SpeedInsights />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-gold focus:text-black focus:rounded-md focus:font-bold focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-white"
          >
            Saltar al contenido principal
          </a>
          <header role="banner">
            <SiteHeader />
          </header>
          <AccountDeletionBanner />
          <main id="main-content" role="main" className="flex-1 pb-20 md:pb-0" style={{ paddingTop: 'calc(var(--header-height, 4rem) + var(--sat, 0px))' }}>
            <PasswordRecoveryGuard>
              <ProfileCompletionGuard>{children}</ProfileCompletionGuard>
            </PasswordRecoveryGuard>
          </main>
          <MobileBottomNav />
          <FloatingActionBtn />
          <SiteFooter />
          <CookieConsentBanner />
          <NotificationPromptBanner />
          <Toaster
            position="top-right"
            richColors
            closeButton
            expand={false}
            duration={3000}
            toastOptions={{
              className: 'border border-gray-200 dark:border-gray-700 shadow-lg',
            }}
          />
        </PWASplashScreen>
      </Providers>
    </NextIntlClientProvider>
  );
}
