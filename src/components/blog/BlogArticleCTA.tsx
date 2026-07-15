'use client';

import { useTranslations } from 'next-intl';
import PWAInstallButton from '@/components/pwa/PWAInstallButton';
import GooglePlayLink from '@/components/pwa/GooglePlayLink';

export default function BlogArticleCTA() {
    const t = useTranslations('blog.cta');

    return (
        <div className="mt-12 pt-8 border-t-2 border-gold/20 dark:border-gold/10 space-y-6">
            {/* Social Follow */}
            <div className="text-center space-y-3">
                <p className="text-gray-700 dark:text-gray-300 font-bold text-base">
                    {t('followUs')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                        href="https://www.instagram.com/cambiocromos.comm/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500 text-white rounded-xl px-5 h-11 transition-all hover:scale-105 font-semibold text-sm shadow-md"
                    >
                        {/* Instagram icon */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                        Instagram
                    </a>
                    <a
                        href="https://www.tiktok.com/@cambiocromos.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-xl px-5 h-11 transition-all hover:scale-105 font-semibold text-sm shadow-md"
                    >
                        {/* TikTok icon */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.13a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-.8-.07 4.86 4.86 0 01-.39-3.91z"/>
                        </svg>
                        TikTok
                    </a>
                </div>
            </div>

            {/* Install App */}
            <div className="text-center space-y-3">
                <p className="text-gray-700 dark:text-gray-300 font-bold text-base">
                    {t('installApp')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <GooglePlayLink
                        source="blog_cta"
                        className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-xl px-5 h-11 transition-all hover:scale-105 font-semibold text-sm shadow-md"
                    >
                        {/* Google Play icon */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z" fill="#4285F4"/>
                            <path d="M5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#EA4335"/>
                            <path d="M16.8 14.209l-2.302 2.302-8.635 8.635L16.8 14.209z" fill="#FBBC05"/>
                            <path d="M5.864 20.542l8.635-8.635 2.302 2.302L5.864 20.542z" fill="#34A853"/>
                            <path d="M16.8 9.791l3.2 1.799a1 1 0 0 1 0 1.82L16.8 14.21 14.498 12 16.8 9.79z" fill="#34A853"/>
                        </svg>
                        Google Play
                    </GooglePlayLink>
                    <PWAInstallButton />
                </div>
            </div>
        </div>
    );
}
