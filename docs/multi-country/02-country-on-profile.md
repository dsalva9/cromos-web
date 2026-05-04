# Phase 2: Country on Profile

> **Parent doc:** [00-overview.md](./00-overview.md) — read this first for full project context, stack, and architecture.
> **Depends on:** [01-feature-flags.md](./01-feature-flags.md) — the `useFeatureFlag('multi_country')` hook must exist.
> **Deployment:** Ships in **Commit 1** together with Phase 1. Safe to push — country picker gated behind `multi_country` flag (defaults `false`), DB migration only adds a column with `DEFAULT 'ES'`.

## Objective

Add a `country_code` column to the `profiles` table so each user belongs to a country. Update the onboarding flow to include a country picker (gated behind the `multi_country` feature flag). Implement country-specific postcode validation for all 6 countries. Seed postal code data for the new countries.

---

## Supported Countries

| Code | Country | Flag | Postcode Name | Format | Regex | Example |
|---|---|---|---|---|---|---|
| `ES` | España | 🇪🇸 | Código Postal | 5 digits | `^\d{5}$` | `28001` |
| `US` | United States | 🇺🇸 | ZIP Code | 5 digits | `^\d{5}$` | `10001` |
| `BR` | Brasil | 🇧🇷 | CEP | 5+3 digits | `^\d{5}-?\d{3}$` | `01310-100` |
| `AR` | Argentina | 🇦🇷 | Código Postal | 4 digits | `^\d{4}$` | `1425` |
| `CO` | Colombia | 🇨🇴 | Código Postal | 6 digits | `^\d{6}$` | `110111` |
| `MX` | México | 🇲🇽 | Código Postal | 5 digits | `^\d{5}$` | `06600` |

---

## Database Changes

### 1. Add `country_code` to `profiles`

```sql
ALTER TABLE profiles
  ADD COLUMN country_code TEXT NOT NULL DEFAULT 'ES'
  CHECK (country_code IN ('ES', 'US', 'BR', 'AR', 'CO', 'MX'));

CREATE INDEX idx_profiles_country ON profiles (country_code);
```

All 236 existing users will default to `'ES'` (Spain).

### 2. Seed `postal_codes` for new countries

The `postal_codes` table already exists with this schema:
```
country  TEXT     -- e.g. 'ES'
postcode TEXT     -- e.g. '28001'
lat      FLOAT8  -- latitude centroid
lon      FLOAT8  -- longitude centroid
municipio TEXT   -- city/town name
provincia TEXT   -- state/province name
PRIMARY KEY (country, postcode)
```

Currently contains 11,150 rows for Spain. We need to add data for US, AR, CO, MX. Brazil (BR) is a separate question due to data size (see Open Decisions in overview).

**Data sources for seed files:**
- **US**: Census Bureau ZCTA data or GeoNames `US.txt` — ~41,000 ZIP codes with lat/lon, city, state
- **AR**: GeoNames `AR.txt` — ~5,500 postal codes with city, province
- **CO**: GeoNames `CO.txt` — ~6,500 postal codes
- **MX**: SEPOMEX data or GeoNames `MX.txt` — ~65,000 postal codes

**Implementation approach:**
1. Download GeoNames postal code files from http://download.geonames.org/export/zip/
2. Transform to CSV matching our schema: `country, postcode, lat, lon, municipio, provincia`
3. Create SQL seed files in `database/seeds/` directory
4. Apply via Supabase migration or direct SQL execution

> **Note on Brazil:** See the open decision in [00-overview.md](./00-overview.md). For now, you can either skip BR seeding or use a simplified district-level dataset (~10K rows). The postcode validation on the frontend should work regardless — it just validates the format.

---

## Frontend Changes

### 1. [NEW] `src/constants/countries.ts`

```typescript
export const SUPPORTED_COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸', currency: '€' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: '$' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', currency: 'R$' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: '$' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: '$' },
  { code: 'MX', name: 'México', flag: '🇲🇽', currency: '$' },
] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code'];
```

### 2. [NEW] `src/lib/validations/postcode.ts`

Country-aware postcode validation rules:

```typescript
export const COUNTRY_POSTCODE_RULES: Record<string, {
  regex: RegExp;
  label: string;
  placeholder: string;
  maxLength: number;
}> = {
  ES: { regex: /^\d{5}$/, label: 'Código Postal', placeholder: '28001', maxLength: 5 },
  US: { regex: /^\d{5}$/, label: 'ZIP Code', placeholder: '10001', maxLength: 5 },
  BR: { regex: /^\d{5}-?\d{3}$/, label: 'CEP', placeholder: '01310-100', maxLength: 9 },
  AR: { regex: /^\d{4}$/, label: 'Código Postal', placeholder: '1425', maxLength: 4 },
  CO: { regex: /^\d{6}$/, label: 'Código Postal', placeholder: '110111', maxLength: 6 },
  MX: { regex: /^\d{5}$/, label: 'Código Postal', placeholder: '06600', maxLength: 5 },
};

export function validatePostcode(postcode: string, countryCode: string): boolean {
  const rule = COUNTRY_POSTCODE_RULES[countryCode];
  if (!rule) return false;
  return rule.regex.test(postcode.trim());
}
```

### 3. [MODIFY] `src/lib/profile/isProfileComplete.ts`

Currently validates that `nickname`, `postcode`, and `avatarUrl` are non-empty. Needs to also accept `countryCode` to validate postcode format:

**Current** (line 13-34):
```typescript
export function isProfileComplete(
    nickname: string | null | undefined,
    postcode: string | null | undefined,
    avatarUrl: string | null | undefined
): boolean { ... }
```

**Updated:**
```typescript
export function isProfileComplete(
    nickname: string | null | undefined,
    postcode: string | null | undefined,
    avatarUrl: string | null | undefined,
    countryCode?: string | null  // NEW — optional for backward compat
): boolean {
    // ... existing checks for non-empty, non-placeholder ...

    // If country is provided, validate postcode format
    if (countryCode && safePostcode) {
      const { validatePostcode } = require('@/lib/validations/postcode');
      if (!validatePostcode(safePostcode, countryCode)) return false;
    }

    return true;
}
```

> **Important:** The function signature must remain backward-compatible since it's called from `ProfileCompletionProvider.tsx` (line 57-61) and the auth callback. Add `countryCode` as an optional 4th parameter.

### 4. [MODIFY] `src/components/providers/ProfileCompletionProvider.tsx`

**What it does today:**
- Fetches `nickname, postcode, avatar_url, is_admin, suspended_at, deleted_at` from profiles
- Provides `isComplete`, `isAdmin`, `profile` to all children

**Changes needed:**

1. Add `country_code` to the `UserProfile` type (line 30-37):
```typescript
type UserProfile = {
  nickname: string | null;
  postcode: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  suspended_at: string | null;
  deleted_at: string | null;
  country_code: string;  // NEW
};
```

2. Fetch `country_code` in the SELECT query (line 140):
```sql
'nickname, postcode, avatar_url, is_admin, suspended_at, deleted_at, country_code'
```

3. Update `computeIsComplete` to pass `countryCode`:
```typescript
function computeIsComplete(profile: UserProfile | null) {
  if (!profile) return false;
  return isProfileComplete(
    profile.nickname,
    profile.postcode,
    profile.avatar_url,
    profile.country_code  // NEW
  );
}
```

4. Expose `country_code` in the context value.

### 5. [MODIFY] Profile completion / onboarding flow

The profile completion guard is at `src/components/profile/ProfileCompletionGuard.tsx` and the actual form is somewhere in the profile completion flow.

**When `multi_country` flag is DISABLED:**
- Behave exactly as today — no country picker, postcode validation assumes Spain

**When `multi_country` flag is ENABLED:**
- Add a **country selector step** as the FIRST step in profile completion
- Show a grid/list of 6 countries with flag emojis and names
- Selected country is saved to profile immediately
- The postcode input that follows adapts its:
  - Label (e.g., "ZIP Code" for US, "CEP" for BR)
  - Placeholder (e.g., "10001" for US)
  - Validation regex
  - Max length

### 6. [MODIFY] `src/hooks/social/useUserProfile.ts`

Currently hardcodes `country: 'ES'` when looking up postal_codes (line 56):
```typescript
.eq('country', 'ES')
```

Change to use the profile's `country_code`:
```typescript
.eq('country', profileData.country_code ?? 'ES')
```

### 7. [MODIFY] `src/utils/provinces.ts`

This file currently contains a hardcoded list of Spanish provinces. It needs to either:
- Be renamed to something like `regions.ts` and organized by country
- Or kept as-is for Spain and extended with separate exports per country

If this file is used for province dropdowns, it should be made country-aware.

---

## Files to Create/Modify Summary

| Action | File | Description |
|---|---|---|
| NEW | `src/constants/countries.ts` | Country definitions |
| NEW | `src/lib/validations/postcode.ts` | Country-specific postcode validation |
| NEW | `database/seeds/postal_codes_us.sql` | US postal code seed data |
| NEW | `database/seeds/postal_codes_ar.sql` | Argentina postal code seed data |
| NEW | `database/seeds/postal_codes_co.sql` | Colombia postal code seed data |
| NEW | `database/seeds/postal_codes_mx.sql` | Mexico postal code seed data |
| MODIFY | `src/lib/profile/isProfileComplete.ts` | Add `countryCode` param |
| MODIFY | `src/components/providers/ProfileCompletionProvider.tsx` | Fetch & expose `country_code` |
| MODIFY | Profile completion form/guard | Country picker step |
| MODIFY | `src/hooks/social/useUserProfile.ts` | Use profile's country for postal lookup |
| MODIFY | `src/utils/provinces.ts` | Make country-aware or extend |
| MIGRATION | Supabase | `ALTER TABLE profiles ADD COLUMN country_code` |

---

## Manual Testing Checklist

### Database
- [ ] `profiles` table has `country_code` column, all existing rows have `'ES'`
- [ ] Can update a user's `country_code` to `'US'` — CHECK constraint allows it
- [ ] Cannot set `country_code` to `'XX'` — CHECK constraint rejects it
- [ ] `postal_codes` table has new rows for US, AR, CO, MX
- [ ] Querying `SELECT count(*) FROM postal_codes WHERE country = 'US'` returns data

### Feature flag OFF (default behavior)
- [ ] Login/signup flow works exactly as before
- [ ] Profile completion shows postcode input with Spanish validation
- [ ] No country picker is shown
- [ ] Existing users see no change

### Feature flag ON (for your admin account)
- [ ] Enable `multi_country` override for your user via admin panel
- [ ] Profile completion now shows a country picker as first step
- [ ] Selecting "United States" changes postcode label to "ZIP Code" and placeholder to "10001"
- [ ] Entering "28001" (Spanish format) for US is rejected
- [ ] Entering "10001" (US format) for US is accepted
- [ ] Selecting "Brasil" shows "CEP" label with placeholder "01310-100"
- [ ] Entering "01310-100" for BR is accepted
- [ ] After completing profile, `country_code` is saved correctly in the database
- [ ] User profile page shows correct location label (city from postal_codes lookup for that country)

### Regression — Nothing Broken
- [ ] Existing Spain users can still edit their postcode
- [ ] Marketplace still loads for Spain users
- [ ] Templates page still loads
- [ ] User profile pages display location correctly for Spanish users
- [ ] Profile completion guard still redirects incomplete profiles
- [ ] No new Sentry errors
- [ ] Mobile layout is not broken by the country picker
