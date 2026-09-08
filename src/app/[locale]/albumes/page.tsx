import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { siteConfig } from '@/config/site';
import { getPublicTemplates, Template } from '@/lib/templates/server-templates';
import { PublicAlbumsContent } from '@/components/albums/PublicAlbumsContent';

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('albumes');
  const baseUrl = `${siteConfig.url}/${locale}`;

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `${baseUrl}/albumes`,
    },
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      url: `${baseUrl}/albumes`,
      siteName: siteConfig.name,
      type: 'website',
    },
  };
}

export default async function AlbumesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations('albumes');
  const initialTemplates = await getPublicTemplates({ limit: 18, sortBy: 'recent' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('meta.jsonLdName'),
    description: t('meta.description'),
    url: `${siteConfig.url}/${locale}/albumes`,
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicAlbumsContent initialTemplates={initialTemplates} />
    </>
  );
}
