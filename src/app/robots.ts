import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/admin/',
                '/debug/',
                '/test-error/',
                '/test-rls/',
                '/ui-demo/',
                '/search/',
                '/_next/static/',
                '/forgot-password',
                '/favorites',
                '/auth/callback',
                '/profile/completar',
                '/profile/reset-password',
            ],
        },
        sitemap: `${siteConfig.url}/sitemap.xml`,
    };
}
