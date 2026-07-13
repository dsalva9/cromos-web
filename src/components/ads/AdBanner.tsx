'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Megaphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAdMob } from '@/hooks/useAdMob';
import { isNative } from '@/lib/platform';

/** Strip the locale prefix from a pathname. */
function stripLocale(path: string): string {
  return path.replace(/^\/(es|en|pt)/, '') || '/';
}

/** Pages where the ad banner should be hidden */
export const AD_BANNER_HIDDEN_PATHS = ['/login', '/register', '/advertise', '/admin'];

/**
 * Height of the ad banner content (without safe-area).
 * Exported so other components can reference it for offset calculations.
 * Mobile: 50px ad + 44px self-promo. Desktop: 90px ad + 56px self-promo.
 */
export const AD_BANNER_HEIGHT = 25; // px — mobile (25px ad, no self-promo)

export function AdBanner() {
  const rawPathname = usePathname();
  const pathname = stripLocale(rawPathname);
  const t = useTranslations('adBanner');

  // Initialise Google AdMob SDK and show native banner on Android.
  // This is a no-op on web/PWA — Adsterra handles those platforms below.
  useAdMob();

  const mobileAdRef = useRef<HTMLDivElement>(null);
  const desktopAdRef = useRef<HTMLDivElement>(null);

  // Defer to client to avoid SSR hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  const [showAdBlockerModal, setShowAdBlockerModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);

  const isHidden = AD_BANNER_HIDDEN_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'));

  useEffect(() => {
    setHasMounted(true);
    setIsNativeApp(isNative());
    if (typeof window !== 'undefined') {
      const checkViewport = () => {
        setIsMobile(window.innerWidth < 768);
      };
      checkViewport();
      window.addEventListener('resize', checkViewport);
      return () => window.removeEventListener('resize', checkViewport);
    }
  }, []);

  // Set desktop ad height CSS variable for the footer offset
  useEffect(() => {
    if (!hasMounted) return;

    const updateAdHeight = () => {
      const isMobileView = window.innerWidth < 768;
      const height = (isHidden || isMobileView) ? '0px' : '45px';
      document.documentElement.style.setProperty('--desktop-ad-height', height);
    };

    updateAdHeight();
    window.addEventListener('resize', updateAdHeight);

    return () => {
      window.removeEventListener('resize', updateAdHeight);
      document.documentElement.style.removeProperty('--desktop-ad-height');
    };
  }, [hasMounted, isHidden]);

  // Adblocker detection
  useEffect(() => {
    if (!hasMounted || isHidden) return;

    let isCheckActive = true;
    let handleVisibilityChange: (() => void) | null = null;

    const performCheck = () => {
      if (!isCheckActive) return;

      // Defer check if the document is not visible yet (to avoid offsetHeight === 0 false positives in background tabs)
      if (document.visibilityState !== 'visible') {
        handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            if (handleVisibilityChange) {
              document.removeEventListener('visibilitychange', handleVisibilityChange);
              handleVisibilityChange = null;
            }
            if (isCheckActive) performCheck();
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return;
      }

      // Bait element check (detects CSS-blocking/cosmetic-blocking adblockers)
      const bait = document.createElement('div');
      bait.className = 'adsbox ads-box ad-zone ad-space doubleclick-ad';
      bait.setAttribute('style', 'position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px;');
      document.body.appendChild(bait);
      
      const styles = window.getComputedStyle?.(bait);
      const isCssBlocked = styles?.display === 'none' || styles?.visibility === 'hidden';
      const isLayoutBlocked = bait.offsetHeight === 0 || bait.clientHeight === 0;
      
      document.body.removeChild(bait);

      if (isCssBlocked || isLayoutBlocked) {
        if (isCheckActive) setShowAdBlockerModal(true);
      }
    };

    const timer = setTimeout(performCheck, 1000);

    return () => {
      isCheckActive = false;
      clearTimeout(timer);
      if (handleVisibilityChange) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [hasMounted, isHidden]);

  // Inject mobile ad script inside a sandboxed iframe using a local same-domain src.
  // Skipped on native Android — AdMob renders a native overlay banner instead.
  useEffect(() => {
    if (!hasMounted || isHidden || !isMobile || isNativeApp) return;

    const container = mobileAdRef.current;
    if (!container) return;

    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = '/ad-frame.html';
    iframe.width = '320';
    iframe.height = '50';
    iframe.style.width = '320px';
    iframe.style.height = '50px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.transform = 'scale(0.5)';
    iframe.style.transformOrigin = 'top left';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    // Allow scripts, same-origin, popups (so clicks open sponsors in new tab), but omit top-navigation to block main window hijacking redirects.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms');

    container.appendChild(iframe);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, isHidden, isMobile, isNativeApp, pathname]);

  // Inject desktop ad script inside a sandboxed iframe (same approach as mobile)
  useEffect(() => {
    if (!hasMounted || isHidden || isMobile) return;

    const container = desktopAdRef.current;
    if (!container) return;

    container.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = '/ad-frame-desktop.html';
    iframe.width = '728';
    iframe.height = '90';
    iframe.style.width = '728px';
    iframe.style.height = '90px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.transform = 'scale(0.5)';
    iframe.style.transformOrigin = 'top left';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    // Allow scripts, same-origin, popups (so clicks open sponsors in new tab), but omit top-navigation to block main window hijacking redirects.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms');

    container.appendChild(iframe);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, isHidden, isMobile, pathname]);

  // On native Android, AdMob renders the banner as a native overlay view.
  // We must not render an empty Adsterra bar — that would waste space under the nav.
  if (!hasMounted || isHidden || isNativeApp) return null;


  return (
    <>
      {showAdBlockerModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto border-2 border-black dark:border-white">
              <Megaphone className="h-8 w-8 text-red-600 dark:text-red-400 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {t('adBlocker.title')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t('adBlocker.description')}
              </p>
            </div>

            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-gold hover:bg-gold-light text-black font-bold h-11 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-all"
            >
              {t('adBlocker.cta')}
            </Button>
          </div>
        </div>
      )}
      {/* ═══════ MOBILE STACK (below bottom nav) ═══════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[calc(var(--z-nav)-1)] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-center"
        style={{
          height: 'calc(25px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Third-party ad (320×50 scaled to 160×25) */}
        <div
          ref={mobileAdRef}
          className="relative mx-auto bg-gray-50 dark:bg-gray-800"
          style={{ width: '160px', height: '25px', overflow: 'hidden' }}
        />
      </div>

      {/* ═══════ DESKTOP STACK (sticky bottom strip) ═══════ */}
      <div
        className="hidden md:flex fixed bottom-0 left-0 right-0 z-[calc(var(--z-nav)-1)] bg-white/80 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200/80 dark:border-gold/20 items-center justify-center"
        style={{ height: '45px' }}
      >
        {/* Third-party ad (728×90 scaled to 364×45) */}
        <div
          ref={desktopAdRef}
          className="relative mx-auto bg-gray-50 dark:bg-gray-800"
          style={{ width: '364px', height: '45px', overflow: 'hidden' }}
        />
      </div>
    </>
  );
}
