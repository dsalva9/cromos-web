import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '@/styles/highlight-animation.css';
import 'sonner/dist/styles.css';
import { siteConfig } from '@/config/site';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { getLocale } from 'next-intl/server';

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
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} — Intercambia cromos deportivos`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: {
      default: `${siteConfig.name} — Intercambia cromos deportivos`,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — Intercambia cromos deportivos`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: `${siteConfig.name} — Intercambia cromos deportivos`,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

/**
 * Root layout — minimal shell.
 * All providers, header, footer, and UI shell live in [locale]/layout.tsx.
 * This layout only sets up the HTML skeleton, fonts, and critical inline scripts.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8347713301854118"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  var theme = localStorage.getItem('theme') || 'light';

                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    root.classList.add('dark');
                  }

                  // Auth hint: set before first paint so the navbar doesn't flash unauthenticated UI
                  // Header is h-16 (4rem) on mobile, sm:h-20 (5rem) on 640px+
                  var isSm = window.matchMedia('(min-width: 640px)').matches;
                  if (localStorage.getItem('cc-was-authed') === '1') {
                    root.setAttribute('data-was-authed', '1');
                    root.style.setProperty('--header-height', isSm ? '5rem' : '4rem');
                  } else {
                    root.style.setProperty('--header-height', isSm ? '8.5rem' : '7.5rem');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex flex-col min-h-dvh bg-gray-50 dark:bg-gray-900 text-foreground antialiased`}
        suppressHydrationWarning
      >
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
