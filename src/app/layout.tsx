import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/site-header';
import { Toaster } from 'sonner';
import 'sonner/dist/sonner.css';
import SupabaseProvider from '@/components/providers/SupabaseProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CambiaCromos - Trade Sports Cards',
  description:
    'Intercambia cromos deportivos con coleccionistas de todo el mundo. La plataforma líder para el trading de cartas deportivas.',
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
              © {new Date().getFullYear()} Cromos
            </div>
          </footer>
          <Toaster position="top-right" richColors expand />
        </SupabaseProvider>
      </body>
    </html>
  );
}

