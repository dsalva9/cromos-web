'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Zap, Bell, Sparkles, Smartphone } from 'lucide-react';
import { isWeb } from '@/lib/platform';
import Image from 'next/image';
import GooglePlayLink from '@/components/pwa/GooglePlayLink';

const DISMISS_KEY = 'android-install-fullscreen-dismissed';
const BANNER_DISMISS_KEY = 'install-banner-dismissed'; // sync with InstallAppBanner
const DISMISS_DAYS = 7;

export function AndroidInstallFullscreenModal() {
    const [visible, setVisible] = useState(false);
    const t = useTranslations('pwa.fullscreen');

    useEffect(() => {
        // Only run on client-side
        if (typeof window === 'undefined') return;

        // 1. Must be Android web browser (not PWA standalone, not Capacitor native app)
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isAndroidBrowser = isWeb() && isAndroid;

        if (!isAndroidBrowser) return;

        // 2. Check if dismissed recently
        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const dismissDate = new Date(dismissedAt);
            const daysSince = (Date.now() - dismissDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < DISMISS_DAYS) return;
        }

        setVisible(true);
    }, []);

    // Prevent background scrolling when modal is visible
    useEffect(() => {
        if (!visible) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [visible]);

    const handleDismiss = useCallback(() => {
        const now = new Date().toISOString();
        localStorage.setItem(DISMISS_KEY, now);
        localStorage.setItem(BANNER_DISMISS_KEY, now); // suppress inline banner too
        setVisible(false);
    }, []);

    const handlePlayStoreClick = useCallback(() => {
        const now = new Date().toISOString();
        localStorage.setItem(DISMISS_KEY, now);
        localStorage.setItem(BANNER_DISMISS_KEY, now); // suppress inline banner too
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[300] flex flex-col bg-gradient-to-b from-slate-950 via-zinc-900 to-black text-white p-6 overflow-y-auto">
            {/* Glowing Background Radial Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

            {/* Top Bar with Close Button */}
            <div className="flex justify-end w-full relative z-10 shrink-0">
                <button
                    onClick={handleDismiss}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Cerrar"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto my-auto py-4 relative z-10 w-full">
                {/* Floating Gold Collectible Card */}
                <div className="relative w-32 h-44 mx-auto mb-6 rounded-2xl overflow-hidden bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 p-[2px] shadow-[0_0_30px_rgba(255,192,0,0.4)] animate-card-float">
                    <div className="w-full h-full bg-zinc-950 rounded-[14px] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-card-shine" />
                        <div className="relative w-24 h-24">
                            <Image
                                src="/assets/LogoBlanco.png"
                                alt="CambioCromos Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                    </div>
                </div>

                {/* Header Title */}
                <h2 className="text-2xl font-black uppercase text-center tracking-tight mb-2 bg-gradient-to-r from-white via-yellow-100 to-primary-dark bg-clip-text text-transparent">
                    {t('title')}
                </h2>
                <p className="text-sm text-center text-gray-300 px-4 mb-6">
                    {t('subtitle')}
                </p>

                {/* Google Play CTA Button (Placed right before the benefits list) */}
                <div className="w-full mb-8">
                    <GooglePlayLink
                        source="android_fullscreen"
                        onClick={handlePlayStoreClick}
                        className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-black font-extrabold rounded-xl py-3 px-6 shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition-all transform active:scale-95 duration-200 cursor-pointer"
                    >
                        {/* Google Play icon */}
                        <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" />
                        </svg>
                        <span>{t('buttonInstall')}</span>
                    </GooglePlayLink>
                </div>

                {/* Benefits List */}
                <div className="w-full space-y-4 mb-8">
                    {/* 1. Speed */}
                    <div className="flex gap-4 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary-dark shrink-0">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">{t('benefitSpeedTitle')}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">{t('benefitSpeedDesc')}</p>
                        </div>
                    </div>

                    {/* 2. Rewards (android exclusive listings highlights) */}
                    <div className="flex gap-4 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary-dark shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">{t('benefitRewardsTitle')}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">{t('benefitRewardsDesc')}</p>
                        </div>
                    </div>

                    {/* 3. Notifications */}
                    <div className="flex gap-4 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary-dark shrink-0">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">{t('benefitNotifyTitle')}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">{t('benefitNotifyDesc')}</p>
                        </div>
                    </div>

                    {/* 4. Direct Access */}
                    <div className="flex gap-4 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary-dark shrink-0">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">{t('benefitDirectTitle')}</h4>
                            <p className="text-xs text-gray-400 mt-0.5">{t('benefitDirectDesc')}</p>
                        </div>
                    </div>
                </div>

                {/* Dismiss Link */}
                <button
                    onClick={handleDismiss}
                    className="text-sm font-semibold text-gray-400 hover:text-white transition-colors py-2 cursor-pointer"
                >
                    {t('buttonDismiss')}
                </button>
            </div>
        </div>
    );
}
