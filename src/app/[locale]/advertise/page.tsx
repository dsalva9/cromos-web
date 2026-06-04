import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdvertiseClient } from './AdvertiseClient';

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'advertise' });
    const url = `${siteConfig.url}/${locale}/advertise`;

    return {
        title: t('metaTitle'),
        description: t('metaDescription'),
        alternates: {
            canonical: url,
        },
        openGraph: {
            title: `${t('metaTitle')} | ${siteConfig.name}`,
            description: t('metaDescription'),
            url: url,
            siteName: siteConfig.name,
            locale: locale === 'en' ? 'en_US' : locale === 'pt' ? 'pt_BR' : 'es_ES',
            type: 'website',
        },
    };
}

export default async function AdvertisePage({ params }: Props) {
    const { locale } = await params;
    
    // Enable static rendering
    setRequestLocale(locale);

    return <AdvertiseClient />;
}
