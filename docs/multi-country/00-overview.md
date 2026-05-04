# Multi-Country & i18n — Overview

## Goal

Launch CambioCromos in **6 countries** (ES 🇪🇸, US 🇺🇸, BR 🇧🇷, AR 🇦🇷, CO 🇨🇴, MX 🇲🇽) with **3 languages** (Spanish, English, Portuguese), all behind a feature flag for safe live testing during open beta.

**Key principle:** Country ≠ Language. A user in Mexico may prefer English. A user in the US may want Spanish. Country determines **which content you see**; language determines **what language the UI speaks**.

---

## Phase Map

| Phase | File | Scope | Status |
|---|---|---|---|
| 1 | [01-feature-flags.md](./01-feature-flags.md) | Feature flag system (`feature_flags` + `user_feature_overrides` tables, admin UI, frontend hook) | ✅ Done & Tested (Apr 2026) |
| 2 | [02-country-on-profile.md](./02-country-on-profile.md) | `country_code` on profiles, country picker in onboarding, postcode validation per country, seed data | ✅ Done & Tested (May 2026) |
| 3 | [03-country-scoped-queries.md](./03-country-scoped-queries.md) | `country_code` on listings & templates, filter all discovery RPCs | ✅ Done & Tested (4 May 2026) |
| 4 | [04-i18n-infrastructure.md](./04-i18n-infrastructure.md) | `next-intl`, locale routing (`/es/`, `/en/`, `/pt/`), language selector | Deferred |
| 5 | [05-translations-and-routes.md](./05-translations-and-routes.md) | Extract ~5,500 strings, translate to EN & PT-BR, route path migration | Deferred |

**Execution order:** Phases 1 → 2 → 3 are complete. Phases 4 → 5 are deferred until needed.

Each phase file contains all the context an agent needs to implement that phase in a new conversation.

---

## Deployment Checkpoints

Ship in **2 commits** for Phases 1–3. Each commit goes through: implement → test locally → test on Vercel preview → push to `main`.

### ✅ Commit 1: Phases 1 + 2 (Feature Flags + Country on Profile) — DONE

**Shipped:** April 2026. Verified on production.

**What went to production:**
- 2 new tables (`feature_flags`, `user_feature_overrides`)
- 1 new column (`profiles.country_code DEFAULT 'ES'`)
- New RPCs (`check_feature_flag`, `get_all_feature_flags`)
- New files: `useFeatureFlag.ts`, `countries.ts`, `postcode.ts`, admin flags page
- Modified files: `isProfileComplete.ts`, `ProfileCompletionProvider.tsx`, `useUserProfile.ts`, onboarding flow
- Postal code seed data for US, AR, CO, MX

### ✅ Commit 2: Phase 3 (Country-Scoped Queries) — DONE

**Shipped:** 4 May 2026. Verified on production.

**What went to production:**
- 2 new columns (`trade_listings.country_code`, `collection_templates.country_code`)
- 2 new indexes
- ~8 modified RPCs (all discovery functions get `p_country_code DEFAULT NULL`)
- Modified marketplace/template hooks (pass `country_code` when flag is ON)
- SSR paths (`server-listings.ts`, `server-templates.ts`) check feature flag server-side
- Old function overloads dropped (cleaned up duplicate signatures)

**Key findings during testing:**
- SSR paths (server-listings, server-templates) must check feature flag via RPC since they can't use hooks
- PostgreSQL creates new overloads instead of replacing when parameter lists differ — old overloads must be explicitly dropped
- `get_marketplace_availability` and `find_mutual_traders` resolve country server-side via `auth.uid()` — no frontend param needed

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

### Database state (production — updated 4 May 2026)
- 236+ users, 185+ listings, 13+ templates, 130K+ postal codes (ES, US, AR, CO, MX)
- `country_code` column on `profiles`, `trade_listings`, and `collection_templates`
- `feature_flags` + `user_feature_overrides` tables for gating
- `check_feature_flag` RPC for both client and server-side flag checks
- All discovery RPCs accept `p_country_code DEFAULT NULL` for country-scoped filtering
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
