import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'legal.cookies' });
    const url = `${siteConfig.url}/legal/cookies`;
    
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

export default function CookiesPage() {
    const t = useTranslations('legal.cookies');
    
    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-gold">{t('title')}</h1>

            <p>{t('intro')}</p>

            <h2>{t('section1Title')}</h2>
            <p>{t('section1Desc')}</p>

            <h2>{t('section2Title')}</h2>

            <h3>{t('section2Sub1')}</h3>
            <p>{t('section2Sub1Intro')}</p>
            <ul>
                <li>{t('section2Sub1Li1')}</li>
                <li>{t('section2Sub1Li2')}</li>
                <li>{t('section2Sub1Li3')}</li>
            </ul>

            <h3>{t('section2Sub2')}</h3>
            <p>{t('section2Sub2Intro')}</p>
            <ul>
                <li>{t('section2Sub2Li1')}</li>
                <li>{t('section2Sub2Li2')}</li>
            </ul>

            <h2>{t('section3Title')}</h2>
            <p>{t('section3Desc')}</p>
        </div>
    );
}
