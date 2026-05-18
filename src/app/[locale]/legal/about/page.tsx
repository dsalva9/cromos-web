import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import PWAInstallButton from '@/components/pwa/PWAInstallButton';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'legal.about' });
    const url = `${siteConfig.url}/legal/about`;

    return {
        title: t('title'),
        description: t('metaDescription'),
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: `${t('title')} | ${siteConfig.name}`,
            description: t('metaDescription'),
            url: url,
            siteName: siteConfig.name,
            locale: locale === 'en' ? 'en_US' : locale === 'pt' ? 'pt_BR' : 'es_ES',
            type: 'website',
        },
    };
}

export default function AboutPage() {
    const t = useTranslations('legal.about');

    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-gold">{t('title')}</h1>

            <p className="text-lg font-bold text-gray-900 dark:text-white">{t('greeting')}</p>

            <p>{t('intro')}</p>
            <p>{t('origin')}</p>
            <p>{t('spark')}</p>
            <p className="italic font-semibold text-gray-700 dark:text-gray-300">&ldquo;{t('quote')}&rdquo;</p>
            <p>{t('start')}</p>
            <p>{t('team')}</p>
            <p>{t('born')}</p>
            <p>{t('community')}</p>
            <p>{t('mission')}</p>
            <p className="font-bold text-gray-900 dark:text-white">{t('cta')}</p>

            {/* Download buttons */}
            <div className="not-prose mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">
                    {t('downloadTitle')}
                </p>
                <div className="flex flex-row flex-wrap items-center gap-4">
                    <a
                        href="https://play.google.com/store/apps/details?id=com.cambiocromos.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-lg px-5 h-[48px] transition-colors no-underline"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#34A853"/>
                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z" fill="#4285F4"/>
                            <path d="M5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#EA4335"/>
                            <path d="M16.8 14.209l-2.302 2.302-8.635 8.635L16.8 14.209z" fill="#FBBC05"/>
                            <path d="M5.864 20.542l8.635-8.635 2.302 2.302L5.864 20.542z" fill="#34A853"/>
                        </svg>
                        <span className="text-sm font-semibold">Google Play</span>
                    </a>
                    <PWAInstallButton />
                </div>
            </div>
        </div>
    );
}
