import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/site-header';
import { Toaster } from 'sonner';
import 'sonner/dist/styles.css';
import SupabaseProvider from '@/components/providers/SupabaseProvider';
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
    <html lang="en" data-theme="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-transparent text-foreground antialiased`}
      >
        <SupabaseProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-1 rounded z-50"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="min-h-screen">
            {children}
          </main>
          <footer className="border-t">
            <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground">
              Â© {new Date().getFullYear()} {siteConfig.name}
            </div>
          </footer>
          <Toaster position="top-right" richColors expand />
        </SupabaseProvider>
      </body>
    </html>
  );
}


