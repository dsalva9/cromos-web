import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isComingSoonMode = process.env.NEXT_PUBLIC_COMING_SOON === 'true';
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get('host') || '';

  // Only show coming soon page on production domain (www.cambiocromos.com)
  const isProductionDomain = hostname.includes('cambiocromos.com');

  // If coming soon mode is enabled AND on production domain
  if (isComingSoonMode && isProductionDomain) {
    // Allow access only to the proximamente page
    if (!pathname.startsWith('/proximamente')) {
      // Redirect all other routes to proximamente
      return NextResponse.redirect(new URL('/proximamente', request.url));
    }
  }

  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
