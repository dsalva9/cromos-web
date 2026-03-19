import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        { path: '', changeFrequency: 'daily' as const, priority: 1 },
        { path: '/explorar', changeFrequency: 'daily' as const, priority: 0.8 },
        { path: '/legal/cookies', changeFrequency: 'monthly' as const, priority: 0.3 },
        { path: '/legal/privacy', changeFrequency: 'monthly' as const, priority: 0.3 },
        { path: '/legal/terms', changeFrequency: 'monthly' as const, priority: 0.3 },
    ];

    return routes.map((route) => ({
        url: `${siteConfig.url}${route.path}`,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
    }));
}
