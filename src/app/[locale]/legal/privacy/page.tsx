import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { getSupportMailtoUrl } from '@/lib/utils';
import { useTranslations } from 'next-intl';

import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'legal.privacy' });
    const url = `${siteConfig.url}/legal/privacy`;
    
    return {
        title: t('title'),
        description: t('intro').substring(0, 150) + '...',
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: `${t('title')} | ${siteConfig.name}`,
            description: t('intro').substring(0, 150) + '...',
            url: url,
            siteName: siteConfig.name,
            locale: locale === 'en' ? 'en_US' : locale === 'pt' ? 'pt_BR' : 'es_ES',
            type: 'website',
        },
    };
}

export default function PrivacyPage() {
    const t = useTranslations('legal.privacy');
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-gold">{t('title')}</h1>
            <p className="text-sm text-gray-500 mb-8">{t('lastUpdated')}</p>

            <p>{t('intro')}</p>

            <h2>{t('section1Title')}</h2>
            <p>
                {t('section1Desc')} <a href={getSupportMailtoUrl(undefined, "Privacidad - CambioCromos").replace("soporte@", "privacidad@")}>privacidad@cambiocromos.com</a>.
            </p>

            <h2>{t('section2Title')}</h2>
            <ul>
                <li dangerouslySetInnerHTML={{ __html: t('section2Li1') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section2Li2') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section2Li3') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section2Li4') }}></li>
            </ul>

            <h2>{t('section3Title')}</h2>
            <p>{t('section3Intro')}</p>
            <ul>
                <li>{t('section3Li1')}</li>
                <li>{t('section3Li2')}</li>
                <li>{t('section3Li3')}</li>
                <li>{t('section3Li4')}</li>
                <li>{t('section3Li5')}</li>
            </ul>

            <h2>{t('section4Title')}</h2>
            <p dangerouslySetInnerHTML={{ __html: t('section4Desc') }}></p>

            <h2>{t('section5Title')}</h2>
            <p>{t('section5Intro')}</p>
            <ul>
                <li dangerouslySetInnerHTML={{ __html: t('section5Li1') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section5Li2') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section5Li3') }}></li>
            </ul>

            <h2>{t('section6Title')}</h2>
            <p>{t('section6Intro')}</p>
            <ul>
                <li>{t('section6Li1')}</li>
                <li>{t('section6Li2')}</li>
            </ul>

            <h2>{t('section7Title')}</h2>
            <p>{t('section7Intro')}</p>
            <ul>
                <li dangerouslySetInnerHTML={{ __html: t('section7Li1') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section7Li2') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section7Li3') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section7Li4') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section7Li5') }}></li>
            </ul>
            <p>
                {t('section7Outro')} <a href={getSupportMailtoUrl(undefined, "Privacidad - CambioCromos").replace("soporte@", "privacidad@")}>privacidad@cambiocromos.com</a>.
            </p>
        </div>
    );
}
