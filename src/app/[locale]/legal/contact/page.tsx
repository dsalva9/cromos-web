import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
    const t = await getTranslations({ locale, namespace: 'legal.contact' });
    const url = `${siteConfig.url}/legal/contact`;

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

export default function ContactPage() {
    const t = useTranslations('legal.contact');

    const reasons = [
        t('reason1'),
        t('reason2'),
        t('reason3'),
        t('reason4'),
        t('reason5'),
        t('reason6'),
        t('reason7'),
    ];

    return (
        <div className="prose dark:prose-invert max-w-none">
            <h1 className="text-3xl font-black uppercase mb-6 text-gold">{t('title')}</h1>

            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">{t('intro')}</p>
            <p className="text-gray-600 dark:text-gray-400">{t('desc')}</p>

            <h2>{t('reasonsTitle')}</h2>
            <ul>
                {reasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                ))}
            </ul>

            <p className="mt-6">
                <a
                    href="mailto:soporte@cambiocromos.com"
                    className="inline-block bg-gold text-black font-black px-6 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all no-underline"
                >
                    soporte@cambiocromos.com
                </a>
            </p>

            <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">{t('outro')}</p>
            <p className="font-black text-gray-900 dark:text-white">{t('thanks')}</p>
        </div>
    );
}
