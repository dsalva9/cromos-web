# Multi-Country & i18n — Overview

## Goal

Launch CambioCromos in **6 countries** (ES 🇪🇸, US 🇺🇸, BR 🇧🇷, AR 🇦🇷, CO 🇨🇴, MX 🇲🇽) with **3 languages** (Spanish, English, Portuguese), all behind a feature flag for safe live testing during open beta.

**Key principle:** Country ≠ Language. A user in Mexico may prefer English. A user in the US may want Spanish. Country determines **which content you see**; language determines **what language the UI speaks**.

---

## Phase Map

| Phase | File | Scope | Status |
|---|---|---|---|
| 1 | [01-feature-flags.md](./01-feature-flags.md) | Feature flag system (`feature_flags` + `user_feature_overrides` tables, admin UI, frontend hook) | Ready |
| 2 | [02-country-on-profile.md](./02-country-on-profile.md) | `country_code` on profiles, country picker in onboarding, postcode validation per country, seed data | Ready |
| 3 | [03-country-scoped-queries.md](./03-country-scoped-queries.md) | `country_code` on listings & templates, filter all discovery RPCs | Ready |
| 4 | [04-i18n-infrastructure.md](./04-i18n-infrastructure.md) | `next-intl`, locale routing (`/es/`, `/en/`, `/pt/`), language selector | Deferred |
| 5 | [05-translations-and-routes.md](./05-translations-and-routes.md) | Extract ~5,500 strings, translate to EN & PT-BR, route path migration | Deferred |

**Execution order:** Phases 1 → 2 → 3 are sequential and approved for immediate work. Phases 4 → 5 are deferred until Phases 1–3 are complete and tested.

Each phase file contains all the context an agent needs to implement that phase in a new conversation.

---

## Deployment Checkpoints

Ship in **2 commits** for Phases 1–3. Each commit goes through: implement → test locally → test on Vercel preview → push to `main`.

### Commit 1: Phases 1 + 2 (Feature Flags + Country on Profile)

**Why it's safe to ship together:** Everything is gated behind the `multi_country` flag, which defaults to `false`. No existing user sees any change. The DB migrations only ADD columns with safe defaults and create new tables.

**What goes to production:**
- 2 new tables (`feature_flags`, `user_feature_overrides`)
- 1 new column (`profiles.country_code DEFAULT 'ES'`)
- New RPCs (`check_feature_flag`, `get_all_feature_flags`)
- New files: `useFeatureFlag.ts`, `countries.ts`, `postcode.ts`, admin flags page
- Modified files: `isProfileComplete.ts`, `ProfileCompletionProvider.tsx`, `useUserProfile.ts`, onboarding flow
- Postal code seed data for US, AR, CO, MX

**Verify before pushing:**
1. `npm run build` passes with no errors
2. All existing pages load (marketplace, templates, profile, admin)
3. Login/signup flow works
4. Profile completion works for Spain users (flag OFF)
5. Enable `multi_country` flag for your admin account → country picker appears
6. Select a non-Spain country → postcode validation adapts
7. Disable flag → everything reverts to normal
8. No new Sentry errors on Vercel preview deploy

### Commit 2: Phase 3 (Country-Scoped Queries)

**Why this is separate:** This commit modifies ~8 live RPC functions. Although the changes use `DEFAULT NULL` (backward compatible), modifying production RPCs is the highest-risk change in the entire plan and deserves its own isolated commit.

**What goes to production:**
- 2 new columns (`trade_listings.country_code`, `collection_templates.country_code`)
- 2 new indexes
- ~8 modified RPCs (all discovery functions get `p_country_code DEFAULT NULL`)
- Modified marketplace/template hooks (pass `country_code` when flag is ON)

**Verify before pushing:**
1. `npm run build` passes
2. **Flag OFF (critical):** Marketplace loads all listings as before. Templates page loads. Search works. Distance sort works. Pagination works.
3. **Flag ON (your admin account):**
   - Spain user sees only ES content
   - Create a test listing as US user → it gets `country_code = 'US'`
   - Spain user does NOT see the US listing
   - Direct URL to a listing works regardless of country
4. Admin panel: listings and templates pages load correctly
5. My Listings / My Templates show user's own data regardless of country
6. Existing chats still work
7. No new Sentry errors on Vercel preview deploy

### Future Commits: Phases 4 + 5

These are deferred. When ready:
- **Commit 3:** Phase 4 (i18n infrastructure) — high risk due to route restructuring. Deploy to preview and test every page.
- **Commit 4:** Phase 5 (translations + route migration) — massive diff (~285 files). Consider shipping in sub-batches if possible.

---

## Current Architecture (Context for all phases)

### Stack
- **Framework**: Next.js 15.5 (App Router), React 19, TypeScript 5.7
- **Styling**: Tailwind CSS 4.0, shadcn/ui (Radix UI)
- **State**: React Context API + Custom Hooks + React Query
- **Backend**: Supabase (PostgreSQL), Supabase Auth, Supabase RPC Functions
- **Deployment**: Vercel
- **Supabase Project ID**: `cuzuzitadwmrlocqhhtu` (eu-west-3)
- **Organization ID**: `ugrehaeypgspjmhlfxjn`

### Key directories
```
src/
├── app/                         # Next.js App Router pages
│   ├── layout.tsx               # Root layout (providers, header, footer)
│   ├── marketplace/             # Marketplace pages
│   ├── templates/               # Template explorer
│   ├── mis-plantillas/          # User's template copies
│   ├── mi-coleccion/            # User's collection
│   ├── profile/                 # User profile
│   └── admin/                   # Admin panel
├── components/
│   ├── providers/               # Context providers
│   │   ├── SupabaseProvider.tsx  # Auth context (user, loading)
│   │   ├── ProfileCompletionProvider.tsx  # Profile context (nickname, postcode, avatar, is_admin)
│   │   ├── QueryProvider.tsx     # React Query
│   │   └── ThemeProvider.tsx     # Dark/light mode
│   ├── marketplace/             # Marketplace components
│   ├── templates/               # Template components
│   └── ui/                      # shadcn/ui base components
├── hooks/
│   ├── marketplace/             # Marketplace data hooks
│   ├── templates/               # Template data hooks
│   ├── social/                  # User profile, ratings hooks
│   └── admin/                   # Admin hooks
├── lib/
│   ├── validations/             # Zod schemas (marketplace.schemas.ts, template.schemas.ts)
│   ├── profile/                 # Profile helpers (isProfileComplete.ts, resolveAvatarUrl.ts)
│   ├── supabase/                # Supabase client factories
│   └── constants.ts             # App constants
├── config/
│   └── site.ts                  # Site name, URL, description
└── types/
    └── v1.6.0.ts                # Database TypeScript types
```

### Key patterns
1. **All data access via Supabase RPC** — never direct table queries from the frontend except for simple profile lookups
2. **Providers compose in `layout.tsx`** via `composeProviders()` — order: Supabase → Query → Theme → OneSignal → DeepLink → ProfileCompletion → ErrorBoundary
3. **Profile completion** — `isProfileComplete(nickname, postcode, avatarUrl)` in `src/lib/profile/isProfileComplete.ts` is the single source of truth
4. **All UI text is hardcoded Spanish** — no translation system exists

### Database state (production)
- 236 users, 185 listings, 11 templates, 11,150 postal codes (Spain only)
- No `country_code` column on any table except `postal_codes`
- No feature flag system
- `listing_type` enum stored as Spanish: `'intercambio'`, `'venta'`, `'ambos'`
- FTS index uses `to_tsvector('spanish', ...)` config

---

## Open Decisions (Cross-Phase)

These are recorded here and referenced from individual phase files:

1. **Brazil CEP data** — The full Brazilian CEP dataset is ~900K rows. Options:
   - (A) Seed a simplified district-level dataset (~10K rows)
   - (B) Use an external API for CEP validation/lookup
   - (C) Seed the full dataset (adds ~50MB to DB)

2. **Currency on listings** — Currently `price` has no currency symbol. Options:
   - (A) Display the country's default currency symbol (€ for ES, $ for US/AR/CO/MX, R$ for BR)
   - (B) Store currency explicitly on each listing

3. **`listing_type` DB values** — Currently stored as Spanish strings. Options:
   - (A) Migrate to language-neutral keys (`'trade'`, `'sale'`, `'both'`) now
   - (B) Keep as-is, translate only in the display layer (Phase 5)
