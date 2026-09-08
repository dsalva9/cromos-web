import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { getPublicTemplateBySlug, getSlugByNumericId } from '@/lib/templates/server-templates';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PublicAlbumDetailContent } from '@/components/albums/PublicAlbumDetailContent';

export const revalidate = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

async function resolveTemplate(slug: string, locale: string) {
  // If slug is purely numeric, redirect to the actual slug URL
  if (/^\d+$/.test(slug)) {
    const actualSlug = await getSlugByNumericId(parseInt(slug));
    if (actualSlug) {
      redirect(`/${locale}/albumes/${actualSlug}`);
    }
    return null;
  }
  return getPublicTemplateBySlug(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations('albumes');
  const baseUrl = `${siteConfig.url}/${locale}`;

  // For numeric slugs, don't generate rich metadata (they'll redirect)
  if (/^\d+$/.test(slug)) {
    return { robots: { index: false, follow: true } };
  }

  const result = await getPublicTemplateBySlug(slug);

  if (!result) {
    return {
      title: t('detail.meta.notFoundTitle'),
      description: t('detail.meta.notFoundDesc'),
      robots: { index: false, follow: true },
    };
  }

  const { template } = result.data;
  const totalSlots = result.data.pages.reduce((sum, p) => sum + p.slots_count, 0);
  const totalPages = result.data.pages.length;

  const title = `${template.title} — ${t('detail.meta.titleSuffix')}`;
  const description = t('detail.meta.descriptionTemplate', {
    title: template.title,
    author: template.author_nickname,
    pages: totalPages.toString(),
    slots: totalSlots.toString(),
  });

  const ogImage = template.image_url || `${siteConfig.url}/assets/LogoBlanco.png`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${baseUrl}/albumes/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/albumes/${slug}`,
      siteName: siteConfig.name,
      type: 'website',
      images: [{ url: ogImage }],
    },
  };
}

export default async function AlbumDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const result = await resolveTemplate(slug, locale);

  if (!result) {
    notFound();
  }

  // Redirect authenticated users to /templates/[id] for the full app experience
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    redirect(`/${locale}/templates/${result.templateId}`);
  }

  const { data, templateId } = result;
  const { template } = data;
  const totalSlots = data.pages.reduce((sum, p) => sum + p.slots_count, 0);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: template.title,
    description: template.description,
    image: template.image_url,
    dateCreated: template.created_at,
    author: {
      '@type': 'Person',
      name: template.author_nickname,
    },
    numberOfItems: totalSlots,
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };

  if (template.rating_count > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: template.rating_avg,
      ratingCount: template.rating_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicAlbumDetailContent data={data} templateId={templateId} />
    </>
  );
}
