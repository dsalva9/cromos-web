import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '@/styles/highlight-animation.css';
import SiteHeader from '@/components/site-header';
import { Toaster } from 'sonner';
import 'sonner/dist/styles.css';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
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
  alternates: {
    canonical: siteConfig.url,
  },
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
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'light';
                  const root = document.documentElement;

                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    root.classList.add('dark');
                  }
                } catch (e) {}
              })();

              // --- COMPREHENSIVE ROUTER DEBUGGER ---
              (function() {
                console.log('[DEBUG] Router debugger initializing...');
                
                // Track all errors
                window.addEventListener('error', function(e) {
                  console.error('[ERROR-DEBUG] Uncaught error:', e.error, e.filename, e.lineno);
                });
                
                window.addEventListener('unhandledrejection', function(e) {
                  console.error('[ERROR-DEBUG] Unhandled promise rejection:', e.reason);
                });
                
                // Track router.push calls (App Router might use different mechanism)
                window.__routerPushCalled = 0;
                
                // Try multiple ways to intercept router
                setTimeout(function() {
                  // Method 1: Pages Router (window.next.router)
                  var checkPagesRouter = setInterval(function() {
                    if (window.next && window.next.router && window.next.router.push) {
                      console.log('[ROUTER-DEBUG] Found Pages Router on window.next.router');
                      var origPush = window.next.router.push;
                      window.next.router.push = function() {
                        window.__routerPushCalled++;
                        console.log('[ROUTER-DEBUG] Pages Router push() called:', arguments[0], 'total:', window.__routerPushCalled);
                        return origPush.apply(this, arguments);
                      };
                      clearInterval(checkPagesRouter);
                    }
                  }, 100);
                  
                  setTimeout(function() { clearInterval(checkPagesRouter); }, 5000);
                  
                  // Method 2: Try to find App Router's internal router
                  // App Router stores router in React Fiber - harder to intercept
                  console.log('[ROUTER-DEBUG] Checking for App Router...');
                }, 100);
                
                // Track popstate for actual navigation events
                window.addEventListener('popstate', function(e) {
                  console.log('[ROUTER-DEBUG] popstate event:', window.location.pathname);
                });
                
                // Track clicks on anchors
                document.addEventListener('click', function(e) {
                  var el = e.target;
                  var anchor = null;
                  var current = el;
                  while (current && current !== document) {
                    if (current.tagName === 'A') { anchor = current; break; }
                    current = current.parentElement;
                  }
                  if (!anchor) return;

                  var href = anchor.getAttribute('href');
                  console.log('[CLICK-DEBUG] Anchor clicked:', {
                    href: href,
                    target: anchor.getAttribute('target'),
                    tagName: el.tagName,
                    defaultPrevented: e.defaultPrevented,
                    isTrusted: e.isTrusted,
                    totalRouterPushCalls: window.__routerPushCalled || 0
                  });

                  // Check for overlaying elements
                  var rect = anchor.getBoundingClientRect();
                  var topEl = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
                  if (topEl !== anchor && !anchor.contains(topEl)) {
                    console.warn('[CLICK-DEBUG] Element on top:', topEl?.tagName, topEl?.className?.slice(0, 80));
                  }
                }, true);

                // Bubble phase check
                document.addEventListener('click', function(e) {
                  var el = e.target;
                  var anchor = null;
                  var current = el;
                  while (current && current !== document) {
                    if (current.tagName === 'A') { anchor = current; break; }
                    current = current.parentElement;
                  }
                  if (!anchor) return;
                  if (e.defaultPrevented) {
                    console.warn('[CLICK-DEBUG] defaultPrevented=true in BUBBLE for:', anchor.getAttribute('href'));
                  }
                }, false);
                
                console.log('[DEBUG] Router debugger initialized');
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-gray-50 dark:bg-gray-900 text-foreground antialiased`}
        suppressHydrationWarning
      >
        <GoogleAnalytics />
        <SupabaseProvider>
          <QueryProvider>
            <ThemeProvider>
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
                      <main id="main-content" role="main" className="min-h-screen pb-20 md:pb-0" style={{ paddingTop: 'calc(var(--header-height, 4rem) + var(--sat, 0px))' }}>
                        <PasswordRecoveryGuard>
                          <ProfileCompletionGuard>{children}</ProfileCompletionGuard>
                        </PasswordRecoveryGuard>
                      </main>
                      <MobileBottomNav />
                      <FloatingActionBtn />
                      <SiteFooter />
                      <CookieConsentBanner />
                    </ErrorBoundary>
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
                  </ProfileCompletionProvider>
                </DeepLinkHandler>
              </OneSignalProvider>
            </ThemeProvider>
          </QueryProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
