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

              // --- TEMPORARY CLICK DEBUGGER (remove after fixing click bug) ---
              (function() {
                // Track router.push calls by intercepting Next.js router
                window.__routerPushCalled = 0;
                window.__routerPushArgs = [];
                
                // Listen for Next.js to mount and patch router
                setTimeout(function() {
                  try {
                    // Access Next.js router via window.next.router
                    var checkRouter = setInterval(function() {
                      if (window.next && window.next.router) {
                        var originalPush = window.next.router.push;
                        window.next.router.push = function() {
                          window.__routerPushCalled++;
                          window.__routerPushArgs.push(arguments[0]);
                          console.log('[ROUTER-DEBUG] router.push() called with:', arguments[0], 'total calls:', window.__routerPushCalled);
                          return originalPush.apply(this, arguments);
                        };
                        clearInterval(checkRouter);
                        console.log('[ROUTER-DEBUG] Router push interceptor installed');
                      }
                    }, 100);
                  } catch(e) {
                    console.error('[ROUTER-DEBUG] Failed to patch router:', e);
                  }
                }, 1000);

                document.addEventListener('click', function(e) {
                  var el = e.target;
                  // Walk up to find the nearest <a> tag
                  var anchor = null;
                  var current = el;
                  while (current && current !== document) {
                    if (current.tagName === 'A') { anchor = current; break; }
                    current = current.parentElement;
                  }
                  if (!anchor) return;

                  console.log('[CLICK-DEBUG] Anchor clicked:', {
                    href: anchor.getAttribute('href'),
                    target: anchor.getAttribute('target'),
                    tagName: el.tagName,
                    defaultPrevented: e.defaultPrevented,
                    cancelBubble: e.cancelBubble,
                    eventPhase: e.eventPhase,
                    isTrusted: e.isTrusted,
                    anchorClasses: anchor.className.slice(0, 80),
                    computedPointerEvents: getComputedStyle(anchor).pointerEvents,
                    computedZIndex: getComputedStyle(anchor).zIndex,
                    anchorRect: anchor.getBoundingClientRect(),
                    totalRouterPushCalls: window.__routerPushCalled || 0
                  });

                  // Check for elements on top of this anchor
                  var rect = anchor.getBoundingClientRect();
                  var topEl = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
                  if (topEl !== anchor && !anchor.contains(topEl)) {
                    console.warn('[CLICK-DEBUG] BLOCKED! Element on top:', topEl, topEl?.tagName, topEl?.className?.slice(0, 80));
                  }
                }, true); // capture phase

                // Also listen in bubble phase to check if defaultPrevented
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
                    console.warn('[CLICK-DEBUG] defaultPrevented=true in BUBBLE phase for:', anchor.getAttribute('href'));
                  }
                }, false); // bubble phase
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
