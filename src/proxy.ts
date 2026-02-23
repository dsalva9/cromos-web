import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that require authentication (page routes)
const PROTECTED_PAGE_PREFIXES = [
    '/admin',
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
const PUBLIC_MARKETPLACE_PATHS = ['/marketplace'];
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

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // --- Supabase Session Refresh & Auth Protection ---
    // Always refresh the session to keep tokens fresh and sync cookies.
    const { user, response } = await updateSession(request);

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
    if (isProtectedRoute(pathname)) {
        if (!user) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = '/login';
            // Preserve the original URL so we can redirect back after login
            loginUrl.searchParams.set('redirectTo', pathname);
            return NextResponse.redirect(loginUrl);
        }
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
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
