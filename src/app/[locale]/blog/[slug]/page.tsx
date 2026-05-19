import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { getTranslations } from 'next-intl/server';
import { getArticleBySlug, getArticleSlugs } from '@/lib/blog';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
import Link from '@/components/ui/link';

type Props = {
    params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
    const slugs = getArticleSlugs();
    return routing.locales.flatMap((locale) =>
        slugs.map((slug) => ({ locale, slug }))
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params;
    const article = getArticleBySlug(slug);
    if (!article) return {};

    const loc = locale as Locale;
    const content = article.content[loc] || article.content.es;
    const url = `${siteConfig.url}/${locale}/blog/${slug}`;

    const alternates: Record<string, string> = {};
    for (const l of routing.locales) {
        alternates[l] = `${siteConfig.url}/${l}/blog/${slug}`;
    }
    alternates['x-default'] = `${siteConfig.url}/${routing.defaultLocale}/blog/${slug}`;

    return {
        title: `${content.title} | ${siteConfig.name}`,
        description: content.summary,
        alternates: {
            canonical: url,
            languages: alternates,
        },
        openGraph: {
            title: content.title,
            description: content.summary,
            url,
            siteName: siteConfig.name,
            locale: locale === 'en' ? 'en_US' : locale === 'pt' ? 'pt_BR' : 'es_ES',
            type: 'article',
            publishedTime: article.publishedAt,
            authors: [article.author],
        },
    };
}

export default async function BlogArticlePage({ params }: Props) {
    const { locale, slug } = await params;
    const article = getArticleBySlug(slug);
    if (!article) notFound();

    const loc = locale as Locale;
    const content = article.content[loc] || article.content.es;
    const t = await getTranslations({ locale, namespace: 'blog' });

    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: content.title,
        description: content.summary,
        datePublished: article.publishedAt,
        author: {
            '@type': 'Organization',
            name: article.author,
            url: siteConfig.url,
        },
        publisher: {
            '@type': 'Organization',
            name: siteConfig.name,
            url: siteConfig.url,
            logo: `${siteConfig.url}/assets/LogoBlanco.png`,
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${siteConfig.url}/${locale}/blog/${slug}`,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
            />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-10">
                <Link
                    href="/blog"
                    className="text-sm font-bold text-gold hover:underline mb-6 inline-block"
                >
                    {t('article.backToBlog')}
                </Link>

                <article className="prose dark:prose-invert max-w-none">
                    <h1 className="text-2xl md:text-3xl font-black uppercase mb-4 text-gray-900 dark:text-white !leading-tight">
                        {content.title}
                    </h1>

                    <div className="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500 mb-8 not-prose">
                        <time dateTime={article.publishedAt}>
                            {t('article.publishedOn')}{' '}
                            {new Date(article.publishedAt).toLocaleDateString(
                                locale === 'en' ? 'en-US' : locale === 'pt' ? 'pt-BR' : 'es-ES',
                                { year: 'numeric', month: 'long', day: 'numeric' }
                            )}
                        </time>
                        <span>·</span>
                        <span>{t('article.by')} {article.author}</span>
                    </div>

                    <div dangerouslySetInnerHTML={{ __html: content.body }} />
                </article>
            </div>
        </>
    );
}
