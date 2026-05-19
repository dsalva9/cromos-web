import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { getTranslations } from 'next-intl/server';
import { getAllArticles } from '@/lib/blog';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import Link from '@/components/ui/link';
import { BookOpen } from 'lucide-react';

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'blog' });
    const url = `${siteConfig.url}/${locale}/blog`;

    const alternates: Record<string, string> = {};
    for (const loc of routing.locales) {
        alternates[loc] = `${siteConfig.url}/${loc}/blog`;
    }
    alternates['x-default'] = `${siteConfig.url}/${routing.defaultLocale}/blog`;

    return {
        title: t('metadata.title'),
        description: t('metadata.description'),
        alternates: {
            canonical: url,
            languages: alternates,
        },
        openGraph: {
            title: t('metadata.title'),
            description: t('metadata.description'),
            url,
            siteName: siteConfig.name,
            locale: locale === 'en' ? 'en_US' : locale === 'pt' ? 'pt_BR' : 'es_ES',
            type: 'website',
        },
    };
}

export default async function BlogIndexPage({ params }: Props) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'blog' });
    const articles = getAllArticles();
    const loc = locale as Locale;

    const blogJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: t('metadata.title'),
        description: t('metadata.description'),
        url: `${siteConfig.url}/${locale}/blog`,
        publisher: {
            '@type': 'Organization',
            name: siteConfig.name,
            url: siteConfig.url,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
            />
            <div className="space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black uppercase text-gray-900 dark:text-white">
                        {t('index.title')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                        {t('index.subtitle')}
                    </p>
                </div>

                {articles.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-12">
                        {t('index.empty')}
                    </p>
                ) : (
                    <div className="grid gap-6">
                        {articles.map((article) => {
                            const content = article.content[loc] || article.content.es;
                            return (
                                <Link
                                    key={article.slug}
                                    href={`/blog/${article.slug}`}
                                    className="block group"
                                >
                                    <article className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-gold dark:hover:border-gold transition-all duration-200 hover:shadow-lg">
                                        <div className="flex items-start gap-4">
                                            <div className="hidden sm:flex w-12 h-12 rounded-xl bg-gold/10 dark:bg-gold/20 items-center justify-center shrink-0 mt-1">
                                                <BookOpen className="w-6 h-6 text-gold" />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white group-hover:text-gold transition-colors line-clamp-2">
                                                    {content.title}
                                                </h2>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                    {content.summary}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                                                    <time dateTime={article.publishedAt}>
                                                        {new Date(article.publishedAt).toLocaleDateString(
                                                            locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'es-ES',
                                                            { year: 'numeric', month: 'long', day: 'numeric' }
                                                        )}
                                                    </time>
                                                    <span>·</span>
                                                    <span>{article.author}</span>
                                                </div>
                                                <span className="inline-block text-sm font-bold text-gold group-hover:underline">
                                                    {t('index.readMore')}
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
