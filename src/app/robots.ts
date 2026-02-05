import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/admin/', '/(authenticated)/', '/debug/', '/test-error/', '/test-rls/', '/ui-demo/'],
        },
        sitemap: `${siteConfig.url}/sitemap.xml`,
    };
}
