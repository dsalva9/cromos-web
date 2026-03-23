import { Metadata } from 'next';
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
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) {
    return {
      title: 'Anuncio no encontrado | Cambio Cromos',
      description: 'Este anuncio puede haber sido eliminado o ya no está disponible.',
      alternates: {
        canonical: `${siteConfig.url}/explorar/${id}`,
      },
    };
  }

  const title = `${listing.title} | Cambio Cromos`;
  const description = listing.description
    ? listing.description.slice(0, 160)
    : `${listing.title}${listing.collection_name ? ` de la colección ${listing.collection_name}` : ''} — disponible en Cambio Cromos.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/explorar/${id}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/explorar/${id}`,
      siteName: siteConfig.name,
      type: 'website',
      ...(listing.image_url ? { images: [{ url: listing.image_url }] } : {}),
    },
  };
}

export default async function PublicListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const listing = await getListingById(id);

  if (!listing) {
    return <ListingDetailContent listing={null} error="Anuncio no encontrado" />;
  }

  return <ListingDetailContent listing={listing} />;
}
