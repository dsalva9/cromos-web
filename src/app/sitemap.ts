import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { routing } from '@/i18n/routing';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Regenerate sitemap at most once per hour
export const revalidate = 3600;

const locales = routing.locales;
const defaultLocale = routing.defaultLocale;

/**
 * Build alternates map for a given path across all locales.
 * This provides hreflang signals to search engines.
 */
function buildAlternates(path: string) {
    const languages: Record<string, string> = {};
    for (const loc of locales) {
        languages[loc] = `${siteConfig.url}/${loc}${path}`;
    }
    // x-default points to the default locale
    languages['x-default'] = `${siteConfig.url}/${defaultLocale}${path}`;
    return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticRoutes = [
        { path: '', changeFrequency: 'daily' as const, priority: 1 },
        { path: '/explorar', changeFrequency: 'daily' as const, priority: 0.8 },
        { path: '/legal/cookies', changeFrequency: 'monthly' as const, priority: 0.3 },
        { path: '/legal/privacy', changeFrequency: 'monthly' as const, priority: 0.3 },
        { path: '/legal/terms', changeFrequency: 'monthly' as const, priority: 0.3 },
    ];

    // Generate one entry per locale per static route
    const staticEntries: MetadataRoute.Sitemap = staticRoutes.flatMap((route) =>
        locales.map((loc) => ({
            url: `${siteConfig.url}/${loc}${route.path}`,
            lastModified: new Date(),
            changeFrequency: route.changeFrequency,
            priority: route.priority,
            alternates: buildAlternates(route.path),
        }))
    );

    // Fetch active listing IDs for dynamic /explorar/[id] pages
    let listingEntries: MetadataRoute.Sitemap = [];
    try {
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

        const { data } = await supabase
            .from('trade_listings')
            .select('id, created_at')
            .eq('status', 'active')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (data) {
            listingEntries = data.flatMap((listing) =>
                locales.map((loc) => ({
                    url: `${siteConfig.url}/${loc}/explorar/${listing.id}`,
                    lastModified: new Date(listing.created_at),
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                    alternates: buildAlternates(`/explorar/${listing.id}`),
                }))
            );
        }
    } catch {
        // If DB query fails, just return static routes — sitemap should never error
    }

    return [...staticEntries, ...listingEntries];
}
