# Performance Optimization Guide

This document outlines performance optimizations implemented in CambioCromos and recommendations for maintaining optimal performance.

## Bundle Size Analysis

### Current Bundle Metrics (v1.6.3)

**Total First Load JS**: ~102 kB (shared across all pages)

**Largest Pages:**
- `/marketplace` - 174 kB
- `/templates` - 208 kB
- `/mis-plantillas/[copyId]` - 189 kB

### Key Dependencies

**Heavy Dependencies:**
- `@sentry/nextjs` - Error tracking (production only)
- `@supabase/supabase-js` - Database client (~54 kB)
- `@radix-ui/*` - UI components (tree-shakeable)
- `lucide-react` - Icons (tree-shakeable)

### Optimization Strategies

1. **Code Splitting**
   - Admin pages use dynamic imports
   - Lazy load heavy components
   - Route-based splitting by default (Next.js)

2. **Tree Shaking**
   - Import only needed components from libraries
   - Use named imports instead of default imports where possible
   - Example: `import { Button } from '@/components/ui/button'` ✅

3. **Image Optimization**
   - All images use Next.js `<Image>` component
   - Automatic format optimization (WebP)
   - Lazy loading by default
   - Proper sizing with `fill` and `sizes` attributes

## Database Query Performance

### Indexed Columns

Critical indexes for query performance:

**Profiles Table:**
- `id` (Primary Key) - ✅ Already indexed
- `nickname` - ⚠️ Recommend adding for search
- `created_at` - ✅ Already indexed

**Trade Listings Table:**
- `id` (Primary Key) - ✅ Already indexed
- `user_id` (Foreign Key) - ✅ Already indexed
- `status` - ✅ Already indexed (for filtering)
- `created_at` - ✅ Already indexed (for sorting)
- `title` - ⚠️ Full-text search index recommended

**Collection Templates Table:**
- `id` (Primary Key) - ✅ Already indexed
- `author_id` (Foreign Key) - ✅ Already indexed
- `is_public` - ✅ Already indexed (for filtering)
- `created_at` - ✅ Already indexed (for sorting)

### Query Optimization Recommendations

1. **Use RPC Functions for Complex Queries**
   - Reduces round trips
   - Server-side processing
   - Better for aggregations

2. **Implement Pagination**
   - All listing pages use limit/offset
   - Current limit: 20 items per page (marketplace)
   - Current limit: 12 items per page (templates)

3. **Select Only Needed Columns**
   - Current implementation selects all columns
   - ⚠️ Future optimization: Use `.select('id, title, ...')` for list views

4. **Avoid N+1 Queries**
   - Use joins in RPC functions
   - Example: `list_trade_listings` joins with profiles table
   - ✅ All current queries are optimized

### Performance Monitoring

**Database Queries to Monitor:**
1. `list_trade_listings` - Most frequent, high traffic
2. `list_public_templates` - Second most frequent
3. `get_template_progress` - Complex aggregations
4. `get_my_template_copies` - User-specific queries

**Recommended Monitoring:**
- Enable Supabase query logging
- Monitor slow query logs (> 100ms)
- Set up alerts for queries > 500ms

## Frontend Performance

### React Performance Optimizations

1. **Memoization**
   - Use `useCallback` for stable function references
   - Use `useMemo` for expensive calculations
   - Current usage: All custom hooks use `useCallback`

2. **Component Optimization**
   - Lazy load heavy components
   - Use React.memo for expensive renders
   - Avoid inline function definitions in render

3. **State Management**
   - Context API for global state (auth, user)
   - Local state for component-specific data
   - No unnecessary re-renders

### Loading States

**Current Implementation:**
- Spinner for page-level loading
- ⚠️ **Recommended**: Add skeleton loaders for better perceived performance

**Pages with Loading States:**
- ✅ Marketplace listing page
- ✅ Template explorer page
- ✅ User profile pages
- ✅ Collection progress pages

### Image Optimization

**Best Practices Implemented:**
- ✅ Next.js Image component for all images
- ✅ Proper `sizes` attribute for responsive images
- ✅ Priority loading for above-fold images
- ✅ Lazy loading for below-fold images

**Image Storage:**
- Supabase Storage for user uploads
- Public bucket with CDN caching
- Max file size: 5MB for stickers, 2MB for avatars

## Performance Budgets

### Target Metrics

**First Contentful Paint (FCP)**: < 1.8s
**Largest Contentful Paint (LCP)**: < 2.5s
**Time to Interactive (TTI)**: < 3.8s
**Cumulative Layout Shift (CLS)**: < 0.1

### Current Performance

**Lighthouse Scores (Target):**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

## Optimization Checklist

### ✅ Completed
- [x] Next.js Image optimization
- [x] Code splitting (route-based)
- [x] Tree shaking enabled
- [x] Production build optimizations
- [x] Gzip compression (Vercel default)
- [x] Database query optimization (RPC functions)
- [x] Pagination implemented
- [x] Loading states for all async operations

### ⚠️ Recommended Future Optimizations
- [ ] Add skeleton loaders instead of spinners
- [ ] Implement virtual scrolling for long lists
- [ ] Add service worker for offline support
- [ ] Implement request caching with SWR or React Query
- [ ] Add database query monitoring
- [ ] Set up performance monitoring (Web Vitals)
- [ ] Optimize font loading (preload critical fonts)
- [ ] Add resource hints (prefetch, preconnect)

## Monitoring & Analytics

### Performance Monitoring

**Recommended Tools:**
1. **Vercel Analytics** - Built-in Web Vitals tracking
2. **Sentry Performance Monitoring** - Already integrated
3. **Google Lighthouse CI** - Automated performance testing

### Database Monitoring

**Supabase Dashboard:**
- Query performance metrics
- Slow query logs
- Database size and growth
- Connection pooling stats

### Error Tracking

**Sentry Integration:**
- ✅ Errors tracked in production
- ✅ Performance monitoring available
- ✅ Release tracking enabled
- 🎯 Target: < 0.1% error rate

## Performance Testing

### Load Testing

**Recommended Tools:**
- Artillery.io for API load testing
- k6 for complex scenarios
- Apache Bench for simple HTTP benchmarks

**Test Scenarios:**
1. Marketplace listing creation (10 req/s)
2. Template discovery page load (50 req/s)
3. User authentication flow (20 req/s)

### Stress Testing

**Critical Endpoints:**
- `POST /api/listings/create` - Listing creation
- `GET /api/listings` - Listing feed
- `GET /api/templates` - Template discovery
- `POST /api/templates/copy` - Template copying

## Best Practices

### Code-Level Optimizations

1. **Avoid Large Dependencies**
   - Check bundle size before adding new packages
   - Use `npm run analyze` to review impact
   - Consider lighter alternatives when possible

2. **Lazy Loading**
   ```typescript
   // Good: Lazy load heavy components
   const AdminDashboard = dynamic(() => import('@/components/admin/Dashboard'), {
     loading: () => <Spinner />,
   });

   // Bad: Import everything upfront
   import AdminDashboard from '@/components/admin/Dashboard';
   ```

3. **Optimize Images**
   ```typescript
   // Good: Use Next.js Image with proper sizing
   <Image
     src={imageUrl}
     alt="Description"
     fill
     sizes="(max-width: 768px) 100vw, 50vw"
   />

   // Bad: Use img tag without optimization
   <img src={imageUrl} alt="Description" />
   ```

### Database Optimizations

1. **Use Appropriate Indexes**
   - Index foreign keys
   - Index frequently filtered columns
   - Use composite indexes for multi-column queries

2. **Optimize Queries**
   - Select only needed columns
   - Use pagination for large datasets
   - Implement caching for static data

3. **Monitor Performance**
   - Enable slow query logging
   - Review query execution plans
   - Set up alerts for degraded performance

## Troubleshooting Performance Issues

### Slow Page Loads

1. Check bundle size: `npm run analyze`
2. Review network waterfall in DevTools
3. Check for blocking resources
4. Verify image optimization

### Slow Database Queries

1. Check Supabase query logs
2. Review execution plans
3. Verify indexes are being used
4. Consider query optimization or caching

### High Memory Usage

1. Check for memory leaks (React DevTools Profiler)
2. Review useEffect cleanup functions
3. Verify no circular references
4. Monitor component render counts

---

**Last Updated**: 2025-01-22
**Next Review**: 2025-04-22 (Quarterly)
