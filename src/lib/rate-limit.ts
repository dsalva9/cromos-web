import { NextResponse } from 'next/server';

/**
 * Simple in-memory sliding-window rate limiter for API routes.
 * 
 * Tracks request timestamps per key (typically IP or user ID).
 * Not persistent across deployments — resets on redeploy.
 * Suitable for serverless environments with low admin traffic.
 */

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    const cutoff = now - windowMs;
    for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
        if (entry.timestamps.length === 0) {
            store.delete(key);
        }
    }
}

interface RateLimitOptions {
    /** Time window in milliseconds (default: 60000 = 1 minute) */
    windowMs?: number;
    /** Maximum requests per window (default: 5) */
    maxRequests?: number;
}

/**
 * Check if a request should be rate-limited.
 * Returns a NextResponse with 429 status if rate limit exceeded, or null if allowed.
 * 
 * @example
 * const rateLimitResponse = checkRateLimit(request, { maxRequests: 3, windowMs: 60000 });
 * if (rateLimitResponse) return rateLimitResponse;
 */
export function checkRateLimit(
    request: Request,
    options: RateLimitOptions = {}
): NextResponse | null {
    const { windowMs = 60_000, maxRequests = 5 } = options;

    // Use IP from headers (works behind proxies like Vercel)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

    cleanup(windowMs);

    const now = Date.now();
    const entry = store.get(ip) || { timestamps: [] };

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => t > now - windowMs);

    if (entry.timestamps.length >= maxRequests) {
        const retryAfterMs = entry.timestamps[0] + windowMs - now;
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);

        return NextResponse.json(
            { error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfterSec),
                    'X-RateLimit-Limit': String(maxRequests),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil((entry.timestamps[0] + windowMs) / 1000)),
                },
            }
        );
    }

    entry.timestamps.push(now);
    store.set(ip, entry);

    return null;
}
