import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '@/styles/highlight-animation.css';
import SiteHeader from '@/components/site-header';
import { Toaster } from 'sonner';
import 'sonner/dist/styles.css';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import { ProfileCompletionProvider } from '@/components/providers/ProfileCompletionProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { siteConfig } from '@/config/site';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: `${siteConfig.name} - Intercambia cromos deportivos`,
  description: siteConfig.description,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

import { OneSignalProvider } from '@/components/providers/OneSignalProvider';
import { DeepLinkHandler } from '@/components/providers/DeepLinkHandler';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import { FloatingActionBtn } from '@/components/navigation/FloatingActionBtn';
import { ProfileCompletionGuard } from '@/components/profile/ProfileCompletionGuard';
import { PasswordRecoveryGuard } from '@/components/auth/PasswordRecoveryGuard';
import { AccountDeletionBanner } from '@/components/deletion';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="light" className="overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-gray-50 text-foreground antialiased overflow-x-hidden`}
      >
        <SupabaseProvider>
          <OneSignalProvider>
            <DeepLinkHandler>
              <ProfileCompletionProvider>
                <ErrorBoundary>
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#FFC000] focus:text-black focus:rounded-md focus:font-bold focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-white"
                  >
                    Saltar al contenido principal
                  </a>
                  <header role="banner">
                    <SiteHeader />
                  </header>
                  <AccountDeletionBanner />
                  <main id="main-content" role="main" className="min-h-screen pb-20 md:pb-0" style={{ paddingTop: 'calc(4rem + var(--sat, 0px))' }}>
                    <PasswordRecoveryGuard>
                      <ProfileCompletionGuard>{children}</ProfileCompletionGuard>
                    </PasswordRecoveryGuard>
                  </main>
                  <MobileBottomNav />
                  <FloatingActionBtn />
                  <SiteFooter />
                </ErrorBoundary>
                <Toaster
                  position="top-right"
                  richColors
                  closeButton
                  expand={false}
                  duration={3000}
                  toastOptions={{
                    className: 'border border-gray-200 shadow-lg',
                    style: {
                      background: '#FFFFFF',
                      color: '#111827',
                    },
                  }}
                />
              </ProfileCompletionProvider>
            </DeepLinkHandler>
          </OneSignalProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
