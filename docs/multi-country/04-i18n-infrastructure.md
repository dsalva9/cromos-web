# Phase 4: i18n Infrastructure

> **Parent doc:** [00-overview.md](./00-overview.md) — read this first for full project context, stack, and architecture.
> **Depends on:** Phases 1–3 completed. `country_code` exists on profiles, listings, and templates. Feature flag system is in place.
> **Deployment:** Ships as **Commit 3**. High risk due to route restructuring (`[locale]` segment). Deploy to Vercel preview and test every page before merging.
> **Status:** DEFERRED — do not implement until Phases 1–3 are tested and stable.

## Objective

Set up the internationalization infrastructure using `next-intl` with locale-based routing (`/es/`, `/en/`, `/pt/`). Add a language selector to the UI. Add a `locale` preference to the user profile. This phase sets up the plumbing — the actual string extraction and translation happens in Phase 5.

---

## Key Design Decisions

1. **Country ≠ Language** — A user in Mexico can choose English. A user in the US can choose Spanish. `country_code` determines content scope; `locale` determines UI language.
2. **Always-prefix routing** — All routes get a locale prefix: `/es/marketplace`, `/en/marketplace`, `/pt/marketplace`. No "default" locale without prefix. This is cleanest for SEO.
3. **3 supported locales:** `es` (Spanish), `en` (English), `pt` (Portuguese/Brazil)
4. **Language selector** — Available everywhere (header or floating). Persists to localStorage for anonymous users, and to `profiles.locale` for authenticated users.
5. **Gated behind `i18n` feature flag** — When disabled, all routes are `/es/` and no language selector is shown. When enabled, full locale routing.

---

## Library

**`next-intl`** — the best i18n library for Next.js App Router.

```bash
npm install next-intl
```

---

## Database Changes

### Add `locale` to `profiles`

```sql
ALTER TABLE profiles
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'es'
  CHECK (locale IN ('es', 'en', 'pt'));
```

This stores the user's language preference. Separate from `country_code`.

---

## Frontend Changes

### 1. [NEW] `src/i18n/` directory

```
src/i18n/
├── routing.ts       # Locale routing configuration
├── request.ts       # next-intl server request config
├── navigation.ts    # Locale-aware Link, redirect, useRouter exports
└── messages/
    ├── es.json      # Spanish strings (extracted in Phase 5)
    ├── en.json      # English strings (Phase 5)
    └── pt.json      # Portuguese strings (Phase 5)
```

#### `src/i18n/routing.ts`
```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'always',
  pathnames: {
    // Phase 5 will add translated pathnames here
    // For now, all paths are the same across locales
    '/marketplace': '/marketplace',
    '/templates': '/templates',
    '/login': '/login',
    '/signup': '/signup',
    // etc.
  },
});
```

#### `src/i18n/request.ts`
```typescript
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

### 2. [MODIFY] `next.config.ts`

Wrap with `createNextIntlPlugin`:

```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Existing config...
export default withNextIntl(withSerwist(withSentryConfig(nextConfig, { ... })));
```

### 3. [MODIFY] App Router structure

Move page files into a `[locale]` dynamic segment:

**Before:**
```
src/app/
├── layout.tsx
├── page.tsx
├── marketplace/
├── templates/
└── ...
```

**After:**
```
src/app/
├── [locale]/
│   ├── layout.tsx      # Locale-aware layout (sets <html lang>)
│   ├── page.tsx
│   ├── marketplace/
│   ├── templates/
│   └── ...
├── layout.tsx           # Root layout (minimal, just <html> shell)
└── ...
```

The root `layout.tsx` becomes minimal. The `[locale]/layout.tsx` contains all providers and sets `<html lang={locale}>`.

### 4. [NEW] Language Selector Component

A dropdown/button in the site header that lets users switch languages:

```typescript
// src/components/LanguageSelector.tsx
const LOCALES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
];
```

When a user switches language:
1. Navigate to the same page with the new locale prefix
2. For authenticated users: update `profiles.locale` in the database
3. For anonymous users: store in `localStorage`

### 5. [MODIFY] `<html lang>` attribute

Currently hardcoded to `"es"` in `layout.tsx` (line 86). After this phase, it reads from the `[locale]` segment:

```tsx
<html lang={locale} data-theme="light" suppressHydrationWarning>
```

### 6. [NEW] Middleware for locale detection

```typescript
// src/middleware.ts (or modify existing)
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

This middleware:
- Detects the user's preferred locale from Accept-Language header or cookie
- Redirects `/marketplace` → `/es/marketplace` (default locale)
- Sets a locale cookie for subsequent requests

---

## SEO Considerations

### `hreflang` tags

Every page should include:
```html
<link rel="alternate" hreflang="es" href="https://cambiocromos.com/es/marketplace" />
<link rel="alternate" hreflang="en" href="https://cambiocromos.com/en/marketplace" />
<link rel="alternate" hreflang="pt" href="https://cambiocromos.com/pt/marketplace" />
<link rel="alternate" hreflang="x-default" href="https://cambiocromos.com/es/marketplace" />
```

`next-intl` handles this via the `alternates` metadata API.

### Sitemap

Update `src/app/sitemap.ts` to generate URLs for all locale variants.

### Canonical URLs

Each locale variant is its own canonical URL. No cross-locale canonical pointing.

---

## Manual Testing Checklist

### Routing
- [ ] `/marketplace` redirects to `/es/marketplace`
- [ ] `/en/marketplace` renders the marketplace page
- [ ] `/pt/marketplace` renders the marketplace page
- [ ] `/xx/marketplace` (invalid locale) redirects to `/es/marketplace`
- [ ] `<html lang>` attribute matches the current locale
- [ ] Browser back/forward works across locale switches

### Language Selector
- [ ] Language selector appears in the header
- [ ] Switching from ES to EN navigates to `/en/...` path
- [ ] Switching from EN to PT navigates to `/pt/...` path
- [ ] For authenticated users: `profiles.locale` is updated in the DB
- [ ] For anonymous users: preference persists in localStorage
- [ ] After login, user's saved locale preference is applied

### SEO
- [ ] `hreflang` tags are present in page source
- [ ] Sitemap includes all locale variants
- [ ] Each locale URL has the correct `<title>` and `<meta description>` language

### Feature Flag
- [ ] When `i18n` flag is OFF: only `/es/` routes work, no language selector
- [ ] When `i18n` flag is ON: all locale routes work, language selector visible

### Regression — Nothing Broken
- [ ] All existing pages work under `/es/` prefix
- [ ] Authentication flow works (login, signup, password reset)
- [ ] Profile completion flow works
- [ ] Marketplace loads with data
- [ ] Templates page loads
- [ ] Chat works
- [ ] Admin panel works
- [ ] Mobile bottom nav links are correct (include locale prefix)
- [ ] PWA manifest and service worker still work
- [ ] No broken internal links
- [ ] No new Sentry errors
