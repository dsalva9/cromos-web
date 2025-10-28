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
  maximumScale: 5,
  themeColor: '#1F2937',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="light" className="overflow-x-hidden">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-[#1F2937] text-foreground antialiased overflow-x-hidden`}
      >
        <SupabaseProvider>
          <ProfileCompletionProvider>
            <ErrorBoundary>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#FFC000] focus:text-black focus:rounded-md focus:font-bold focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-[#1F2937]"
              >
                Saltar al contenido principal
              </a>
              <header role="banner">
                <SiteHeader />
              </header>
              <main id="main-content" role="main" className="min-h-screen pt-16">
                {children}
              </main>
              <footer role="contentinfo" className="border-t">
                <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground">
                  Ac {new Date().getFullYear()} {siteConfig.name}
                </div>
              </footer>
            </ErrorBoundary>
            <Toaster
              position="top-right"
              richColors
              closeButton
              expand={false}
              duration={3000}
              toastOptions={{
                className: 'border-2 border-black',
                style: {
                  background: '#374151',
                  color: 'white',
                },
              }}
            />
          </ProfileCompletionProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
