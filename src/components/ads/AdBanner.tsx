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

  // Inject mobile Adsterra ad directly into a scaled wrapper div.
  //
  // We do NOT use an outer sandbox iframe because Adsterra's invoke.js creates its own
  // inner iframe, and the sandbox restrictions on our outer frame prevent that inner frame
  // from loading correctly (double-iframe + sandbox incompatibility).
  //
  // Security: Adsterra's ad iframe is cross-origin (highperformanceformat.com) and
  // the browser's own cross-origin policy prevents it from navigating the top frame —
  // no explicit sandbox is needed to stop redirect hijacking.
  //
  // The 320×50 ad is scaled to 160×25 via CSS transform so the strip stays compact.
  // Skipped on native Android — AdMob renders a native overlay banner instead.
  useEffect(() => {
    if (!hasMounted || isHidden || !isMobile || isNativeApp) return;

    const container = mobileAdRef.current;
    if (!container) return;

    container.innerHTML = '';

    // Scaled wrapper: renders 320×50 ad as 160×25 visual
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '320px';
    wrapper.style.height = '50px';
    wrapper.style.transform = 'scale(0.5)';
    wrapper.style.transformOrigin = 'top left';

    // Adsterra config — must be defined before invoke.js
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.text = `atOptions = { 'key': '207f77c777a93d9b339e6e77660a9707', 'format': 'iframe', 'height': 50, 'width': 320, 'params': {} };`;

    // Adsterra invoke — creates the ad iframe inside the wrapper
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://www.highperformanceformat.com/207f77c777a93d9b339e6e77660a9707/invoke.js';

    wrapper.appendChild(configScript);
    wrapper.appendChild(invokeScript);
    container.appendChild(wrapper);

    return () => {
      container.innerHTML = '';
    };
  }, [hasMounted, isHidden, isMobile, isNativeApp, pathname]);

  // Inject desktop Adsterra ad directly into a scaled wrapper div (same rationale as mobile).
  // 728×90 leaderboard is scaled to 364×45 visual via CSS transform.
  useEffect(() => {
    if (!hasMounted || isHidden || isMobile) return;

    const container = desktopAdRef.current;
    if (!container) return;

    container.innerHTML = '';

    // Scaled wrapper: renders 728×90 ad as 364×45 visual
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.width = '728px';
    wrapper.style.height = '90px';
    wrapper.style.transform = 'scale(0.5)';
    wrapper.style.transformOrigin = 'top left';

    // Adsterra config — must be defined before invoke.js
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.text = `atOptions = { 'key': 'cda4bca11f2cef504a11b56506742be3', 'format': 'iframe', 'height': 90, 'width': 728, 'params': {} };`;

    // Adsterra invoke — creates the ad iframe inside the wrapper
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = 'https://www.highperformanceformat.com/cda4bca11f2cef504a11b56506742be3/invoke.js';

    wrapper.appendChild(configScript);
    wrapper.appendChild(invokeScript);
    container.appendChild(wrapper);

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
