# ISR Page Caching

This document explains the Incremental Static Regeneration (ISR) caching implementation for page load performance optimization.

## Background

### Problem

Pages like `/templates`, `/mis-plantillas`, and `/marketplace` were loading slowly despite having fast database queries (0.25ms-5.8ms). The slowness was caused by:

1. **No static caching** - Every request created a fresh Supabase client, established auth session, and ran RPC queries
2. **Serverless cold starts** - Functions needed initialization on each new request
3. **Network latency** - Round-trip to Supabase added ~100-500ms per request

### Solution

Added **Incremental Static Regeneration (ISR)** using Next.js `revalidate` exports. This enables:

- **Edge caching** - Pages served from CDN cache
- **Background regeneration** - Cache refreshes without blocking users
- **Instant subsequent loads** - Cached pages load in <50ms

---

## Implementation

### Public Pages (ISR Enabled)

For pages with public content, we use `revalidate` to enable ISR caching:

```typescript
// src/app/templates/page.tsx
export const revalidate = 60; // Cache for 60 seconds

// src/app/marketplace/page.tsx
export const revalidate = 30; // Cache for 30 seconds
```

**How it works:**

1. First visitor triggers server-side render
2. Response is cached at the edge (CDN)
3. Subsequent visitors get cached response instantly
4. After `revalidate` seconds, next request triggers background regeneration
5. New cache is served once regeneration completes

### Authenticated Pages (Dynamic)

For pages requiring authentication, we explicitly mark them as dynamic:

```typescript
// src/app/mis-plantillas/page.tsx
export const dynamic = 'force-dynamic';
```

**Why not ISR for authenticated pages?**

- User-specific data cannot be cached
- Auth session must be validated on each request
- Serving cached authenticated content would be a security risk

---

## Affected Pages

| Page | Export | Cache Duration | Reason |
|------|--------|----------------|--------|
| `/templates` | `revalidate = 60` | 60 seconds | Public listing, moderate freshness needed |
| `/marketplace` | `revalidate = 30` | 30 seconds | Public listing, more dynamic content |
| `/mis-plantillas` | `dynamic = 'force-dynamic'` | None | Requires authentication |

---

## Client-Side Behavior

ISR only affects the initial page load. Once loaded:

- **Search/filter** - Triggers client-side RPC calls (not cached)
- **Sorting** - Triggers client-side RPC calls (not cached)
- **Pagination** - Triggers client-side RPC calls (not cached)

This is intentional - interactive features need fresh data.

---

## Trade-offs

### Pros

- Dramatically faster initial page loads
- Reduced load on Supabase
- Better user experience
- Lower serverless costs (fewer invocations)

### Cons

- Data can be up to `revalidate` seconds stale
- First visitor after cache expires may see slight delay
- Need to consider cache when debugging production issues

---

## Related

- [Next.js ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
- [Vercel ISR Caching](https://vercel.com/docs/incremental-static-regeneration)
