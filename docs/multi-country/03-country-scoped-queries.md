# Phase 3: Country-Scoped Queries

> **Status:** ✅ **DONE & TESTED** — Shipped 4 May 2026. All checklist items verified on production.
> **Parent doc:** [00-overview.md](./00-overview.md) — read this first for full project context, stack, and architecture.
> **Depends on:** [02-country-on-profile.md](./02-country-on-profile.md) — `profiles.country_code` must exist and be populated.
> **Deployment:** Shipped as **Commit 2**. Legacy function overloads cleaned up. SSR paths gate on feature flag via `check_feature_flag` RPC.

## Objective

Add `country_code` to `trade_listings` and `collection_templates` so all content is associated with a country. Update all discovery/listing RPC functions to filter by country. When the `multi_country` flag is enabled, users only see content from their own country. When disabled, everything behaves as today (no filtering).

---

## Database Changes

### 1. Add `country_code` to `trade_listings`

```sql
ALTER TABLE trade_listings
  ADD COLUMN country_code TEXT NOT NULL DEFAULT 'ES'
  CHECK (country_code IN ('ES', 'US', 'BR', 'AR', 'CO', 'MX'));

CREATE INDEX idx_trade_listings_country ON trade_listings (country_code);
```

All 185 existing listings default to `'ES'`.

### 2. Add `country_code` to `collection_templates`

```sql
ALTER TABLE collection_templates
  ADD COLUMN country_code TEXT NOT NULL DEFAULT 'ES'
  CHECK (country_code IN ('ES', 'US', 'BR', 'AR', 'CO', 'MX'));

CREATE INDEX idx_collection_templates_country ON collection_templates (country_code);
```

All 11 existing templates default to `'ES'`.

### 3. Modify `create_trade_listing` RPC

Auto-populate `country_code` from the author's profile. Find the existing function and add:

```sql
-- In the INSERT statement, add country_code:
INSERT INTO trade_listings (..., country_code)
VALUES (..., (SELECT country_code FROM profiles WHERE id = auth.uid()));
```

### 4. Modify `create_template` RPC

Same pattern — inherit country from author's profile:

```sql
INSERT INTO collection_templates (..., country_code)
VALUES (..., (SELECT country_code FROM profiles WHERE id = auth.uid()));
```

### 5. Modify Discovery RPCs

Each of these RPCs needs a new optional parameter `p_country_code TEXT DEFAULT NULL`. When provided, add `AND country_code = p_country_code` to the WHERE clause. When NULL, no filtering (backward compatible).

#### RPCs that need country filtering:

| RPC Name | Current Purpose | Change |
|---|---|---|
| `list_trade_listings` (2 overloads) | Browse marketplace | Add country filter |
| `list_trade_listings_filtered` | Browse with ignore-user filter | Add country filter |
| `list_trade_listings_filtered_with_distance` | Browse with distance sort | Add country filter |
| `list_trade_listings_with_collection_filter` | Browse with collection/search filter | Add country filter |
| `list_public_templates` | Browse template explorer | Add country filter |
| `find_mutual_traders` | Find users to trade with | Filter to same country |
| `admin_list_marketplace_listings` | Admin: browse all listings | Add optional country filter |
| `admin_list_templates` | Admin: browse all templates | Add optional country filter |

**Pattern for each RPC:**

Before:
```sql
CREATE OR REPLACE FUNCTION list_trade_listings(p_limit INT, p_offset INT, ...)
...
WHERE tl.status = 'active' AND tl.deleted_at IS NULL
...
```

After:
```sql
CREATE OR REPLACE FUNCTION list_trade_listings(
  p_limit INT,
  p_offset INT,
  ...,
  p_country_code TEXT DEFAULT NULL  -- NEW
)
...
WHERE tl.status = 'active'
  AND tl.deleted_at IS NULL
  AND (p_country_code IS NULL OR tl.country_code = p_country_code)  -- NEW
...
```

#### RPCs that do NOT need country filtering:

These operate on specific entities by ID or on the user's own data:
- `get_template_details`, `get_template_progress`, `get_template_copy_slots`
- `get_listing_chats`, `send_listing_message`, `get_listing_chat_participants`
- `get_my_template_copies`, `get_my_listings_with_progress`
- `get_user_listings` — shows a specific user's listings (already scoped)
- `list_my_favorite_listings` — shows user's own favorites
- All mutation RPCs (create, update, delete, reserve, etc.)

### 6. Update FTS index (optional, can defer)

Current FTS index uses Spanish text search config:
```sql
CREATE INDEX idx_listings_search_spanish
  USING GIN (to_tsvector('spanish', title || ' ' || COALESCE(collection_name, '')));
```

This works well for ES/AR/CO/MX but won't stem English or Portuguese correctly. For now, this is acceptable — the trigram indexes (`gin_trgm_ops`) handle fuzzy/partial matching regardless of language. The FTS index can be updated to `'simple'` config in Phase 4 if needed.

---

## Frontend Changes

### 1. [MODIFY] Marketplace listing hooks

All marketplace discovery hooks need to pass `p_country_code` from the user's profile context.

Find the hooks that call the RPCs listed above. They're in `src/hooks/marketplace/`. Each one needs:

```typescript
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

// Inside the hook:
const { profile } = useProfileCompletion();
const { enabled: multiCountry } = useFeatureFlag('multi_country');

// When calling the RPC:
const { data, error } = await supabase.rpc('list_trade_listings_...', {
  p_limit: limit,
  p_offset: offset,
  // ... existing params
  p_country_code: multiCountry ? profile?.country_code ?? 'ES' : null,  // NEW
});
```

**Key pattern:** When `multi_country` flag is OFF → pass `null` (no filtering). When ON → pass user's `country_code`.

### 2. [MODIFY] Template listing hooks

Same pattern for template discovery hooks in `src/hooks/templates/`:

```typescript
const { data, error } = await supabase.rpc('list_public_templates', {
  // ... existing params
  p_country_code: multiCountry ? profile?.country_code ?? 'ES' : null,
});
```

### 3. [MODIFY] Mutual traders hook

If `find_mutual_traders` is used in the UI, update it the same way.

### 4. [MODIFY] Listing creation flow

When creating a listing, the RPC auto-inherits country from the profile (done in step 3 above). No frontend change needed for the data. But consider showing the user's country flag/label on the listing creation form as a visual confirmation.

### 5. [MODIFY] Template creation flow

Same as listings — the country is auto-populated from the author's profile.

### 6. [OPTIONAL] Country badge on listing cards

Consider adding a small country flag emoji/badge on `ListingCard` and `TemplateCard` components so users can see which country a listing belongs to. This is especially useful in the admin panel where admins see all countries.

---

## Files to Create/Modify Summary

| Action | File | Description |
|---|---|---|
| MIGRATION | Supabase | `ALTER TABLE` for listings and templates |
| MODIFY | `create_trade_listing` RPC | Auto-populate country_code |
| MODIFY | `create_template` RPC | Auto-populate country_code |
| MODIFY | 8 discovery RPCs | Add `p_country_code` parameter |
| MODIFY | `src/hooks/marketplace/useListings.ts` (or equivalent) | Pass country_code |
| MODIFY | `src/hooks/marketplace/useMarketplaceListings.ts` (or equivalent) | Pass country_code |
| MODIFY | `src/hooks/templates/usePublicTemplates.ts` (or equivalent) | Pass country_code |
| MODIFY | Other marketplace/template discovery hooks | Pass country_code |
| OPTIONAL | ListingCard, TemplateCard | Show country flag badge |

---

## Manual Testing Checklist

### Database
- [ ] `trade_listings` has `country_code` column, all 185 rows have `'ES'`
- [ ] `collection_templates` has `country_code` column, all 11 rows have `'ES'`
- [ ] New index `idx_trade_listings_country` exists
- [ ] New index `idx_collection_templates_country` exists
- [ ] `create_trade_listing` creates a listing with the author's country_code
- [ ] `create_template` creates a template with the author's country_code

### Feature flag OFF (no filtering)
- [ ] Marketplace shows all listings (same as before)
- [ ] Templates page shows all templates (same as before)
- [ ] Creating a listing works — listing gets `country_code = 'ES'`
- [ ] No change in user experience

### Feature flag ON (country filtering active)

**Prep:** Create a test user with `country_code = 'US'` and another with `country_code = 'ES'`.

- [ ] Spain user sees only ES listings in marketplace
- [ ] Spain user sees only ES templates
- [ ] US user sees NO listings (none exist yet for US)
- [ ] US user creates a listing → it gets `country_code = 'US'`
- [ ] US user now sees their own listing in marketplace
- [ ] Spain user does NOT see the US listing
- [ ] US user creates a template → it gets `country_code = 'US'`
- [ ] Spain user does NOT see the US template

### Cross-country interactions
- [ ] A user can still view a specific listing by direct URL regardless of country (e.g., `/marketplace/123`)
- [ ] Chat between users of different countries still works if they have the URL
- [ ] User profile pages work across countries (viewing a US user from a Spain account)
- [ ] Favorites still work — a user can favorite a listing from another country if they have the URL

### Admin panel
- [ ] Admin listings page shows all countries (or has a filter)
- [ ] Admin templates page shows all countries (or has a filter)

### Regression — Nothing Broken
- [ ] Marketplace pagination works
- [ ] Marketplace search/filter works
- [ ] Distance sorting still works for Spain users
- [ ] Template explorer sorting (popular, recent, rating) works
- [ ] My Listings page shows the user's own listings regardless of country
- [ ] My Templates page shows the user's own templates regardless of country
- [ ] Existing chats and conversations are accessible
- [ ] Notifications still work
- [ ] No new Sentry errors
- [ ] Mobile layout is not broken
