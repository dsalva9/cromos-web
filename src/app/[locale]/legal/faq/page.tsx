import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { useTranslations } from 'next-intl';
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
        </div>
    );
}
