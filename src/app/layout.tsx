import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '@/styles/highlight-animation.css';
import SiteHeader from '@/components/site-header';
import { Toaster } from 'sonner';
import 'sonner/dist/styles.css';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
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
          <ErrorBoundary>
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-50 bg-primary text-primary-foreground px-3 py-2 rounded"
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
        </SupabaseProvider>
      </body>
    </html>
  );
}

