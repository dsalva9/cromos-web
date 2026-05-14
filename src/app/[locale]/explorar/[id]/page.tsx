import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { siteConfig } from '@/config/site';
import { Listing } from '@/types/v1.6.0';
import { ListingDetailContent } from '@/components/marketplace/ListingDetailContent';

// Revalidate every 60 seconds — ISR for detail pages
export const revalidate = 60;

/**
 * Fetch a single listing by ID on the server.
 */
async function getListingById(id: string): Promise<Listing | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch { /* Ignored in SC */ }
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }); } catch { /* Ignored in SC */ }
        },
      },
    }
  );

  const { data, error } = await supabase
    .from('trade_listings')
    .select(
      `
      *,
      author:profiles!user_id (
        nickname,
        avatar_url,
        is_suspended,
        deleted_at
      )
    `
    )
    .eq('id', parseInt(id))
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    user_id: data.user_id,
    author_nickname: data.author.nickname ?? '',
    author_avatar_url: data.author.avatar_url ?? null,
    author_is_suspended: data.author.is_suspended,
    author_deleted_at: data.author.deleted_at,
    deleted_at: data.deleted_at,
    title: data.title,
    description: data.description,
    sticker_number: data.sticker_number,
    collection_name: data.collection_name,
    image_url: data.image_url,
    status: data.status ?? 'active',
    views_count: data.views_count ?? 0,
    created_at: data.created_at ?? '',
    copy_id: data.copy_id,
    slot_id: data.slot_id,
    page_number: data.page_number,
    page_title: data.page_title,
    slot_variant: data.slot_variant,
    global_number: data.global_number,
    is_group: data.is_group,
    group_count: data.group_count,
    listing_type: (data as any).listing_type || 'intercambio',
    price: (data as any).price,
  };
}

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'explorar.detail' });
  const listing = await getListingById(id);
  // Normalize URL: strip www for consistent canonical URLs
  const baseUrl = siteConfig.url;

  if (!listing) {
    return {
      title: t('meta.notFoundTitle'),
      description: t('meta.notFoundDesc'),
      alternates: {
        canonical: `${baseUrl}/explorar/${id}`,
      },
    };
  }

  // Build a rich title: "Cromo Name - Collection Name | Cambio Cromos"
  const titleParts = [listing.title];
  if (listing.collection_name) titleParts.push(listing.collection_name);
  const title = titleParts.join(' - ');

  // Build a structured description for SEO
  const descParts: string[] = [];
  if (listing.collection_name) descParts.push(`${t('meta.stickerFromCollection')} ${listing.collection_name}`);
  if (listing.sticker_number) descParts.push(`${t('meta.numberPrefix')}${listing.sticker_number}${listing.slot_variant || ''}`);
  const listingTypeLabel = listing.listing_type === 'venta' ? t('meta.forSale') :
    listing.listing_type === 'ambos' ? t('meta.forTradeAndSale') : t('meta.forTrade');
  descParts.push(listingTypeLabel);
  if (listing.price != null && (listing.listing_type === 'venta' || listing.listing_type === 'ambos')) {
    descParts.push(`${t('meta.forPrice', { price: Number(listing.price).toFixed(2) })}`);
  }
  descParts.push(t('meta.communitySuffix'));
  const description = descParts.join(' — ');

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/explorar/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/explorar/${id}`,
      siteName: siteConfig.name,
      type: 'website',
      ...(listing.image_url ? { images: [{ url: listing.image_url }] } : {}),
    },
  };
}

export default async function PublicListingDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'explorar.detail' });
  const listing = await getListingById(id);

  if (!listing) {
    return <ListingDetailContent listing={null} error="${t('meta.notFoundTitle')}" />;
  }

  const baseUrl = siteConfig.url;

  // Build Product JSON-LD for rich results
  const productJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    url: `${baseUrl}/explorar/${id}`,
    description: listing.description || `${t('meta.jsonLdDescFallbackSticker')} ${listing.title}${listing.collection_name ? ` ${t('meta.jsonLdDescFallbackFrom')} ${listing.collection_name}` : ''}`,
    ...(listing.image_url ? { image: listing.image_url } : {}),
    ...(listing.collection_name ? { category: listing.collection_name } : {}),
    ...(listing.sticker_number ? { sku: `${listing.sticker_number}${listing.slot_variant || ''}` } : {}),
  };

  // Add Offer when the listing has a price
  if (listing.price != null && (listing.listing_type === 'venta' || listing.listing_type === 'ambos')) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: Number(listing.price).toFixed(2),
      priceCurrency: 'EUR',
      availability: listing.status === 'active'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url: `${baseUrl}/explorar/${id}`,
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ListingDetailContent listing={listing} />
    </>
  );
}
