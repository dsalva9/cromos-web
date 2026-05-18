import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { useTranslations } from 'next-intl';
import PWAInstallButton from '@/components/pwa/PWAInstallButton';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'legal.faq' });
    const url = `${siteConfig.url}/legal/faq`;

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

export default function FAQPage() {
    const t = useTranslations('legal.faq');

    const questions = [
        { q: t('q1'), a: t('a1') },
        { q: t('q2'), a: t('a2') },
        { q: t('q3'), a: t('a3') },
        { q: t('q4'), a: t('a4') },
        { q: t('q5'), a: t('a5') },
        { q: t('q6'), a: t('a6') },
        { q: t('q7'), a: t('a7') },
        { q: t('q8'), a: t('a8') },
        { q: t('q9'), a: t('a9') },
    ];

    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-gold">{t('title')}</h1>

            <div className="space-y-8 not-prose">
                {questions.map((item, i) => (
                    <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-2">{item.q}</h2>
                        <p
                            className="text-gray-600 dark:text-gray-400 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: item.a }}
                        />
                    </div>
                ))}
            </div>

            {/* Download section */}
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
