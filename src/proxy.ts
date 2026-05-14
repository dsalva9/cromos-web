import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';

// --- next-intl locale middleware ---
const intlMiddleware = createIntlMiddleware(routing);

// Routes that require authentication (page routes)
// NOTE: These are checked AFTER stripping the locale prefix.
const PROTECTED_PAGE_PREFIXES = [
    '/admin',
    '/dashboard',
    '/profile',
    '/chats',
    '/favorites',
    '/mis-plantillas',
    '/mi-coleccion',
];

// API routes that require authentication
const PROTECTED_API_PREFIXES = ['/api/admin'];

// Routes that should remain public even if they share a prefix with protected routes
// e.g. /marketplace is public but /marketplace/create requires auth
const PROTECTED_MARKETPLACE_PATHS = [
    '/marketplace/create',
    '/marketplace/my-listings',
    '/marketplace/reservations',
];

/**
 * Check if a marketplace path requires authentication.
 * The main listing pages (/marketplace, /marketplace/[id]) are public,
 * but /marketplace/create, /marketplace/my-listings, /marketplace/reservations,
 * and /marketplace/[id]/edit, /marketplace/[id]/chat require auth.
 */
function isProtectedMarketplacePath(pathname: string): boolean {
    // Explicit protected sub-paths
    for (const prefix of PROTECTED_MARKETPLACE_PATHS) {
        if (pathname.startsWith(prefix)) return true;
    }
    // /marketplace/[id]/edit and /marketplace/[id]/chat
    if (/^\/marketplace\/[^/]+\/(edit|chat)/.test(pathname)) return true;
    return false;
}

/**
 * Check if a templates path requires authentication.
 * /templates (listing) and /templates/[id] (view) are public,
 * but /templates/create and /templates/[id]/edit require auth.
 */
function isProtectedTemplatesPath(pathname: string): boolean {
    if (pathname === '/templates/create') return true;
    if (/^\/templates\/[^/]+\/edit/.test(pathname)) return true;
    return false;
}

function isProtectedRoute(pathname: string): boolean {
    // Check standard protected prefixes
    for (const prefix of PROTECTED_PAGE_PREFIXES) {
        if (pathname.startsWith(prefix)) return true;
    }

    // Check marketplace protected paths
    if (isProtectedMarketplacePath(pathname)) return true;

    // Check templates protected paths
    if (isProtectedTemplatesPath(pathname)) return true;

    return false;
}

function isProtectedApiRoute(pathname: string): boolean {
    for (const prefix of PROTECTED_API_PREFIXES) {
        if (pathname.startsWith(prefix)) return true;
    }
    return false;
}

/**
 * Strip the locale prefix from a pathname for route-matching.
 * e.g. '/es/admin' → '/admin', '/en/marketplace/create' → '/marketplace/create'
 */
function stripLocalePrefix(pathname: string): string {
    const match = pathname.match(/^\/(es|en|pt)(\/.*)?$/);
    return match ? (match[2] || '/') : pathname;
}

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // --- 1. Skip next-intl for auth callbacks, API routes, and static SEO/PWA files ---
    // These routes don't need locale handling.
    const isAuthOrApi = pathname.startsWith('/auth/')
        || pathname.startsWith('/api/')
        || pathname === '/robots.txt'
        || pathname === '/sitemap.xml'
        || pathname === '/manifest.json'
        || pathname === '/icon.png';

    let intlHeaders: Headers | null = null;

    if (!isAuthOrApi) {
        // --- 2. Run next-intl locale negotiation ---
        // This handles: locale detection, adding prefix, redirecting to default locale.
        const intlResponse = intlMiddleware(request);

        // If next-intl produced a redirect (e.g., / → /es/), return it immediately.
        // No need to run Supabase auth on redirects.
        const location = intlResponse.headers.get('location');
        if (location) {
            return intlResponse;
        }

        // Stash the intl headers so we can forward them onto the auth response.
        // This is critical: intlMiddleware sets x-next-intl-locale which tells
        // next-intl/server which messages to load. Without forwarding it, the
        // server always falls back to the defaultLocale (Spanish).
        intlHeaders = intlResponse.headers;
    }

    // --- 3. Supabase Session Refresh & Auth Protection ---
    // Always refresh the session to keep tokens fresh and sync cookies.
    const { user, response } = await updateSession(request);

    // Forward next-intl locale headers onto the final response
    if (intlHeaders) {
        intlHeaders.forEach((value, key) => {
            response.headers.set(key, value);
        });
    }

    // For locale-prefixed routes, strip the prefix before checking auth
    const pathWithoutLocale = stripLocalePrefix(pathname);

    // Protect API routes: return 401 JSON response if unauthenticated
    if (isProtectedApiRoute(pathname)) {
        if (!user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }
    }

    // Protect page routes: redirect unauthenticated users to /login
    if (isProtectedRoute(pathWithoutLocale)) {
        if (!user) {
            const loginUrl = request.nextUrl.clone();
            // Extract current locale prefix for the redirect
            const localeMatch = pathname.match(/^\/(es|en|pt)\//);
            const locale = localeMatch ? localeMatch[1] : 'es';
            loginUrl.pathname = `/${locale}/login`;
            // Preserve the original URL so we can redirect back after login
            loginUrl.searchParams.set('redirectTo', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // Redirect authenticated users from locale root (e.g., /es/) to /es/marketplace
    // so returning to the app always lands on the marketplace.
    if ((pathWithoutLocale === '/' || pathWithoutLocale === '') && user) {
        const localeMatch = pathname.match(/^\/(es|en|pt)/);
        const locale = localeMatch ? localeMatch[1] : 'es';
        const marketplaceUrl = request.nextUrl.clone();
        marketplaceUrl.pathname = `/${locale}/marketplace`;
        return NextResponse.redirect(marketplaceUrl);
    }

    return response;
}

// Configure which routes the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Static assets (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml)$).*)',
    ],
};
