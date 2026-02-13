import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
    const authRoutes = ['/login', '/signup', '/forgot-password'];

    const routes = [
        '',
        '/login',
        '/signup',
        '/forgot-password',
        '/marketplace',
        '/legal/cookies',
        '/legal/privacy',
        '/legal/terms',
    ].map((route) => ({
        url: `${siteConfig.url}${route}`,
        lastModified: new Date(),
        changeFrequency: (authRoutes.includes(route) ? 'monthly' : 'daily') as 'monthly' | 'daily',
        priority: route === '' ? 1 : authRoutes.includes(route) ? 0.5 : 0.8,
    }));

    return routes;
}
