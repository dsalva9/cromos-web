import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, Serwist } from 'serwist';

// Declare the injection point for the precache manifest
declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: false,
    // Minimal caching strategy (Option A):
    // - Only cache immutable static assets from Next.js build
    // - No caching for API calls or page navigations
    // - Offline navigation falls back to /~offline page
    runtimeCaching: [
        {
            // Cache immutable Next.js static assets (hashed filenames)
            matcher: ({ request, url }) => {
                return url.pathname.startsWith('/_next/static/');
            },
            handler: new CacheFirst({
                cacheName: 'next-static-assets',
            }),
        },
    ],
    fallbacks: {
        entries: [
            {
                url: '/~offline',
                matcher({ request }) {
                    return request.destination === 'document';
                },
            },
        ],
    },
});

serwist.addEventListeners();
