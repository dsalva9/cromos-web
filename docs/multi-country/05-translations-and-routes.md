# Phase 5: String Extraction, Translation & Route Migration

> **Parent doc:** [00-overview.md](./00-overview.md) — read this first for full project context, stack, and architecture.
> **Depends on:** [04-i18n-infrastructure.md](./04-i18n-infrastructure.md) — `next-intl` must be set up with locale routing working.
> **Deployment:** Ships as **Commit 4**. Massive diff (~285 files). Consider shipping in sub-batches by feature area (marketplace first, then templates, then profile/admin).
> **Status:** DEFERRED — do not implement until Phase 4 is tested and stable.

## Objective

Extract all ~5,500 hardcoded Spanish strings from the codebase into `next-intl` message files. Translate to English and Brazilian Portuguese. Migrate route paths to locale-specific slugs. Set up 301 redirects from old paths to new locale-prefixed paths.

---

## Scope

| Area | File Count | Estimated Strings |
|---|---|---|
| Components (`src/components/`) | ~202 `.tsx` files | ~4,500 |
| Pages (`src/app/`) | ~61 `.tsx` files | ~800 |
| Validation schemas (`src/lib/validations/`) | 2 files | ~40 |
| Constants / config | ~5 files | ~30 |
| Hooks (error/toast messages) | ~15 files | ~80 |
| **Total** | **~285 files** | **~5,500 strings** |

---

## Message File Structure

Organize by page/feature namespace:

```json
// src/i18n/messages/es.json
{
  "common": {
    "loading": "Cargando...",
    "error": "Ha ocurrido un error",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "back": "Volver",
    "search": "Buscar",
    "noResults": "No se encontraron resultados",
    "viewProfile": "Ver perfil"
  },
  "auth": {
    "login": "Iniciar Sesión",
    "signup": "Registrarse",
    "logout": "Cerrar Sesión",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "loginToContact": "Iniciar Sesión para contactar al vendedor"
  },
  "marketplace": {
    "title": "Marketplace",
    "createListing": "Crear Anuncio",
    "editListing": "Editar Anuncio",
    "deleteListing": "Eliminar Anuncio",
    "contactSeller": "Contactar Vendedor",
    "noListings": "Sin anuncios",
    "status": {
      "active": "Disponible",
      "reserved": "Reservado",
      "completed": "Completado",
      "sold": "Completado",
      "removed": "Eliminado"
    },
    "listingType": {
      "intercambio": "Intercambio",
      "venta": "Venta",
      "ambos": "Intercambio y Venta"
    },
    "seller": "Vendedor",
    "views": "{count} visualizaciones",
    "stickerDetails": "Detalles del Cromo",
    "collection": "Colección",
    "page": "Página",
    "stickerNumber": "Número de cromo",
    "globalNumber": "Número global",
    "description": "Descripción",
    "listingTypeLabel": "Tipo de Anuncio",
    "availableForTrade": "Disponible para intercambio con otros cromos",
    "forSale": "En venta por {price}",
    "thisIsYourListing": "Este es tu anuncio",
    "viewConversations": "Ver Conversaciones",
    "noConversations": "Sin Conversaciones",
    "restore": "Restaurar Anuncio",
    "notFound": "Anuncio no encontrado",
    "notFoundDescription": "Este anuncio puede haber sido eliminado o ya no está disponible"
  },
  "templates": {
    "title": "Plantillas",
    "myTemplates": "Mis Plantillas",
    "createTemplate": "Crear Plantilla",
    "explore": "Explorar Plantillas"
  },
  "profile": {
    "title": "Mi Perfil",
    "editProfile": "Editar Perfil",
    "nickname": "Nombre de usuario",
    "postcode": "Código Postal",
    "country": "País"
  },
  "validation": {
    "titleMin": "El título debe tener al menos {min} caracteres",
    "titleMax": "El título no puede exceder {max} caracteres",
    "descriptionMax": "La descripción no puede exceder {max} caracteres",
    "imageRequired": "La imagen es obligatoria",
    "imageInvalidUrl": "La URL de la imagen no es válida",
    "priceRequired": "El precio es obligatorio cuando el anuncio incluye venta",
    "pricePositive": "El precio debe ser mayor que 0",
    "termsRequired": "Debes aceptar los términos de uso"
  },
  "admin": {
    "deleteDialog": "Eliminar Listado (Admin)",
    "reasonRequired": "Motivo (requerido)",
    "reasonPlaceholder": "Explica por qué se elimina este listado...",
    "retentionNotice": "El listado será eliminado permanentemente después de 90 días de retención.",
    "confirmDelete": "Confirmar Eliminación",
    "deleting": "Eliminando...",
    "suspendedAuthor": "Autor Suspendido",
    "deletedAuthor": "Autor Eliminado"
  }
}
```

The `en.json` and `pt.json` follow the same structure with translated values.

---

## String Extraction Process

### Step-by-step for each component file:

1. **Import `useTranslations`:**
```typescript
import { useTranslations } from 'next-intl';
```

2. **Get the namespace translator:**
```typescript
const t = useTranslations('marketplace');
```

3. **Replace hardcoded strings:**

Before:
```tsx
<h2>Anuncio no encontrado</h2>
<p>Este anuncio puede haber sido eliminado o ya no está disponible</p>
<Button>Volver al Marketplace</Button>
```

After:
```tsx
<h2>{t('notFound')}</h2>
<p>{t('notFoundDescription')}</p>
<Button>{t('backToMarketplace')}</Button>
```

4. **For strings with variables:**

Before:
```tsx
<span>{listing.views_count} visualizaciones</span>
```

After:
```tsx
<span>{t('views', { count: listing.views_count })}</span>
```

### Special cases

#### Zod validation messages

The current validation schemas in `src/lib/validations/marketplace.schemas.ts` have hardcoded Spanish error messages. These need to be translated using `next-intl`'s message format.

**Approach:** Create a helper that generates Zod schemas with translated messages:
```typescript
export function createListingSchema(t: (key: string, params?: object) => string) {
  return z.object({
    title: z.string()
      .min(3, t('validation.titleMin', { min: 3 }))
      .max(100, t('validation.titleMax', { max: 100 })),
    // ...
  });
}
```

#### Toast messages

All `toast.success()`, `toast.error()`, etc. calls have hardcoded Spanish. These need to use `t()`:
```typescript
// Before
toast.success('Anuncio movido a Eliminados');
// After
toast.success(t('movedToDeleted'));
```

#### Date formatting

Replace `new Date(listing.created_at).toLocaleDateString()` with locale-aware formatting:
```typescript
import { useFormatter } from 'next-intl';
const format = useFormatter();
format.dateTime(new Date(listing.created_at), { dateStyle: 'medium' });
```

#### Currency formatting

Use `Intl.NumberFormat` with the locale and country's currency:
```typescript
const formatter = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: countryCurrency, // '€', '$', 'R$'
});
formatter.format(listing.price);
```

#### `listing_type` enum values

These are stored in the DB as `'intercambio'`, `'venta'`, `'ambos'`. The display labels need translation but the DB values stay as-is (unless migrated per open decision in overview):
```typescript
// Display mapping
const listingTypeLabel = t(`listingType.${listing.listing_type}`);
```

---

## Route Path Migration

### Translated route slugs

Configure in `src/i18n/routing.ts`:

```typescript
export const routing = defineRouting({
  locales: ['es', 'en', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'always',
  pathnames: {
    '/marketplace': '/marketplace',
    '/marketplace/[id]': '/marketplace/[id]',
    '/marketplace/create': {
      es: '/marketplace/crear',
      en: '/marketplace/create',
      pt: '/marketplace/criar',
    },
    '/templates': {
      es: '/plantillas',
      en: '/templates',
      pt: '/modelos',
    },
    '/my-templates': {
      es: '/mis-plantillas',
      en: '/my-templates',
      pt: '/meus-modelos',
    },
    '/my-collection': {
      es: '/mi-coleccion',
      en: '/my-collection',
      pt: '/minha-colecao',
    },
    '/login': {
      es: '/iniciar-sesion',
      en: '/login',
      pt: '/entrar',
    },
    '/signup': {
      es: '/registro',
      en: '/signup',
      pt: '/cadastro',
    },
    '/favorites': {
      es: '/favoritos',
      en: '/favorites',
      pt: '/favoritos',
    },
    '/chats': '/chats',
    '/profile': {
      es: '/perfil',
      en: '/profile',
      pt: '/perfil',
    },
  },
});
```

### 301 Redirects from old paths

Add redirects in `next.config.ts` for the old non-locale-prefixed paths:

```typescript
async redirects() {
  return [
    // Old paths → new locale-prefixed paths
    { source: '/marketplace', destination: '/es/marketplace', permanent: true },
    { source: '/mis-plantillas', destination: '/es/mis-plantillas', permanent: true },
    { source: '/mi-coleccion', destination: '/es/mi-coleccion', permanent: true },
    { source: '/templates', destination: '/es/plantillas', permanent: true },
    { source: '/login', destination: '/es/iniciar-sesion', permanent: true },
    { source: '/signup', destination: '/es/registro', permanent: true },
    { source: '/favorites', destination: '/es/favoritos', permanent: true },
    { source: '/chats', destination: '/es/chats', permanent: true },
    { source: '/profile', destination: '/es/perfil', permanent: true },
    { source: '/marketplace/:path*', destination: '/es/marketplace/:path*', permanent: true },
    // ... existing PHP redirects
  ];
},
```

### Update all internal `<Link>` components

Replace `next/link` with locale-aware links from `next-intl`:

```typescript
// Before
import Link from 'next/link';
<Link href="/marketplace">

// After
import { Link } from '@/i18n/navigation';
<Link href="/marketplace">  // automatically prefixed with current locale
```

---

## Files to Create/Modify Summary

| Action | File | Description |
|---|---|---|
| NEW | `src/i18n/messages/es.json` | All Spanish strings (~5,500) |
| NEW | `src/i18n/messages/en.json` | English translation |
| NEW | `src/i18n/messages/pt.json` | Portuguese translation |
| MODIFY | ~285 component/page/hook files | Replace hardcoded strings with `t()` |
| MODIFY | `src/lib/validations/marketplace.schemas.ts` | Parameterize error messages |
| MODIFY | `src/lib/validations/template.schemas.ts` | Parameterize error messages |
| MODIFY | `src/i18n/routing.ts` | Add translated pathnames |
| MODIFY | `next.config.ts` | Add 301 redirects |
| MODIFY | All `<Link>` components | Use locale-aware Link |
| MODIFY | `src/app/sitemap.ts` | Generate locale variants |
| MODIFY | `src/config/site.ts` | Locale-aware site metadata |

---

## Manual Testing Checklist

### Translations
- [ ] All pages render in Spanish at `/es/...`
- [ ] All pages render in English at `/en/...`
- [ ] All pages render in Portuguese at `/pt/...`
- [ ] No untranslated strings visible (search for Spanish text on English pages)
- [ ] Validation error messages appear in the correct language
- [ ] Toast notifications appear in the correct language
- [ ] Dates are formatted in the correct locale format
- [ ] Currency symbols match the user's country

### Route Migration
- [ ] `/marketplace` → 301 to `/es/marketplace`
- [ ] `/mis-plantillas` → 301 to `/es/mis-plantillas`
- [ ] All old paths redirect correctly
- [ ] Internal links use locale-aware paths
- [ ] `/en/my-templates` works (translated slug)
- [ ] `/pt/meus-modelos` works (translated slug)
- [ ] Breadcrumbs and nav links use correct locale paths
- [ ] Mobile bottom nav uses correct locale paths

### SEO
- [ ] Google Search Console shows no new crawl errors
- [ ] Sitemap includes all locale variants for all pages
- [ ] `hreflang` tags are present and correct on every page
- [ ] Page titles and meta descriptions are in the correct language
- [ ] `<html lang>` matches the locale

### Regression — Nothing Broken
- [ ] All existing functionality works in all 3 languages
- [ ] Authentication flow works across locale switches
- [ ] Profile completion works in all languages
- [ ] Marketplace creation/editing works in all languages
- [ ] Chat works
- [ ] Admin panel works
- [ ] Capacitor/PWA still works (deep links with locale prefixes)
- [ ] No broken images or assets
- [ ] No new Sentry errors
- [ ] Performance: no noticeable slowdown from loading message files
