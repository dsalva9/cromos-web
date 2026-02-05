# SEO Configuration

This guide explains the SEO implementation for the CambioCromos platform, covering robots.txt, sitemap.xml, and canonical tags.

## Components

### 1. Robots.txt
Located at `src/app/robots.ts`.
- **Purpose**: Instructions for web crawlers.
- **Configuration**:
    - Allows access to all distinct user agents (`*`).
    - Disallows access to API routes, admin panels, and authenticated pages to preserve crawl budget and security.
    - Points to the dynamic sitemap.

### 2. Sitemap.xml
Located at `src/app/sitemap.ts`.
- **Purpose**: Lists all valid public URLs for search engines.
- **Configuration**:
    - Dynamically generates XML based on `siteConfig.url`.
    - Includes:
        - Landing page (`/`)
        - Marketplace (`/marketplace`)
        - Auth pages (`/login`, `/signup`)
        - Legal pages (`/legal/*`)
    - **Important**: Ensure `NEXT_PUBLIC_APP_URL` environment variable is set in production to `https://www.cambiocromos.com`. If not set, it falls back to the Vercel URL.

### 3. Canonical Tags
Configured in `src/app/layout.tsx`.
- **Purpose**: Prevents duplicate content issues by specifying the "master" URL for a page.
- **Configuration**:
    - Uses Next.js `metadata.alternates` with `canonical: './'`.
    - This automatically resolves to the full canonical URL for every page using the `metadataBase` (which is set to `siteConfig.url`).

## Maintenance

- **Adding new public pages**:
    - Add the route to `src/app/sitemap.ts` in the `routes` array.
- **Changing domain**:
    - Update `NEXT_PUBLIC_APP_URL` in your deployment environment variables.
    - Update `src/config/site.ts` if the fallback URL needs changing.
