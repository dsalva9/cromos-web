import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { getSupportMailtoUrl } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';


export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'legal.terms' });
    const url = `${siteConfig.url}/legal/terms`;
    
    return {
        title: t('title'),
        description: t('section1Desc').substring(0, 150) + '...',
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: `${t('title')} | ${siteConfig.name}`,
            description: t('section1Desc').substring(0, 150) + '...',
            url: url,
            siteName: siteConfig.name,
            locale: locale === 'en' ? 'en_US' : locale === 'pt' ? 'pt_BR' : 'es_ES',
            type: 'website',
        },
    };
}

export default function TermsPage() {
    const t = useTranslations('legal.terms');

    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-gold">{t('title')}</h1>
            <p className="text-sm text-gray-500 mb-8">{t('lastUpdated')}</p>

            <h2>{t('section1Title')}</h2>
            <p>{t('section1Desc')}</p>

            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 my-6">
                <h3 className="text-red-700 dark:text-red-400 font-bold m-0 uppercase">{t('alertTitle')}</h3>
                <p 
                    className="m-0 mt-2 text-red-600 dark:text-red-300"
                    dangerouslySetInnerHTML={{ __html: t('alertDesc') }}
                ></p>
            </div>

            <h2>{t('section2Title')}</h2>
            <p>{t('section2Desc')}</p>

            <h2>{t('section3Title')}</h2>
            <p>{t('section3Intro')}</p>
            <ul>
                <li dangerouslySetInnerHTML={{ __html: t('section3Li1') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section3Li2') }}></li>
                <li dangerouslySetInnerHTML={{ __html: t('section3Li3') }}></li>
            </ul>

            <h3>{t('section31Title')}</h3>
            <p>{t('section31Intro')}</p>
            <ul>
                <li>{t('section31Li1')}</li>
                <li>{t('section31Li2')}</li>
                <li>{t('section31Li3')}</li>
                <li>{t('section31Li4')}</li>
            </ul>

            <h2>{t('section4Title')}</h2>
            <p>{t('section4Intro')}</p>
            <ul>
                <li>{t('section4Li1')}</li>
                <li>{t('section4Li2')}</li>
                <li dangerouslySetInnerHTML={{ __html: t('section4Li3') }}></li>
            </ul>

            <h2>{t('section5Title')}</h2>
            <p>{t('section5Desc')}</p>

            <h2>{t('section6Title')}</h2>
            <p>{t('section6Desc')}</p>

            <h2>{t('section7Title')}</h2>
            <p>
                {t('section7Desc')} <a href={getSupportMailtoUrl(undefined, "Legal - CambioCromos").replace("soporte@", "legal@")}>legal@cambiocromos.com</a>
            </p>
        </div>
    );
}
