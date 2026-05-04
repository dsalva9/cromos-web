# Phase 1: Feature Flag System

> **Status:** ✅ **DONE & TESTED** — Shipped April 2026. All checklist items verified on production.
> **Parent doc:** [00-overview.md](./00-overview.md) — read this first for full project context, stack, and architecture.
> **Deployment:** Shipped in **Commit 1** together with Phase 2.

## Objective

Create a flexible, database-backed feature flag system that allows:
- Global on/off for any feature
- Per-user overrides (so admins/testers can try features in production)
- Frontend hook for gating UI behind flags
- Admin panel UI for managing flags

This is the **foundation** that all subsequent multi-country phases depend on.

---

## Prerequisites

- Access to Supabase project `cuzuzitadwmrlocqhhtu`
- Familiarity with the existing admin panel at `src/app/admin/`
- Understanding of the provider pattern used in `src/app/layout.tsx`

---

## Database Changes

### 1. Create `feature_flags` table

```sql
CREATE TABLE feature_flags (
  id TEXT PRIMARY KEY,                    -- e.g. 'multi_country', 'i18n'
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false, -- global default
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read flags (they are not secrets, and unauthenticated users need them too)
CREATE POLICY "Anyone can read flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage flags"
  ON feature_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
```

### 2. Create `user_feature_overrides` table

```sql
CREATE TABLE user_feature_overrides (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  flag_id TEXT REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, flag_id)
);

ALTER TABLE user_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Users can read their own overrides
CREATE POLICY "Users can read own overrides"
  ON user_feature_overrides FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all overrides
CREATE POLICY "Admins can manage overrides"
  ON user_feature_overrides FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
```

### 3. Create `check_feature_flag` RPC

```sql
CREATE OR REPLACE FUNCTION check_feature_flag(p_flag_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    -- First: check per-user override
    (SELECT enabled FROM user_feature_overrides
     WHERE user_id = auth.uid() AND flag_id = p_flag_id),
    -- Fallback: global flag value
    (SELECT enabled FROM feature_flags WHERE id = p_flag_id),
    -- Default: disabled
    false
  );
$$;
```

### 4. Create `get_all_feature_flags` RPC (for admin panel)

```sql
CREATE OR REPLACE FUNCTION get_all_feature_flags()
RETURNS TABLE (
  id TEXT,
  description TEXT,
  enabled BOOLEAN,
  override_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    ff.id,
    ff.description,
    ff.enabled,
    (SELECT count(*) FROM user_feature_overrides WHERE flag_id = ff.id) AS override_count,
    ff.created_at,
    ff.updated_at
  FROM feature_flags ff
  ORDER BY ff.created_at;
$$;
```

### 5. Seed initial flags

```sql
INSERT INTO feature_flags (id, description, enabled) VALUES
  ('multi_country', 'Enable multi-country features (country picker, scoped content)', false),
  ('i18n', 'Enable internationalization (language selector, translated UI)', false);
```

---

## Frontend Changes

### 1. [NEW] `src/hooks/useFeatureFlag.ts`

Create a hook that checks a specific flag for the current user:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';

/**
 * Hook to check if a feature flag is enabled for the current user.
 * Uses React Query for caching (5 min stale time).
 * Returns false while loading or on error (safe default).
 */
export function useFeatureFlag(flagId: string): { enabled: boolean; loading: boolean } {
  const supabase = useSupabaseClient();
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', flagId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_feature_flag', {
        p_flag_id: flagId,
      });
      if (error) throw error;
      return data as boolean;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    enabled: data ?? false,
    loading: isLoading,
  };
}
```

**Usage in components:**
```typescript
const { enabled: multiCountryEnabled } = useFeatureFlag('multi_country');

if (multiCountryEnabled) {
  // Show country picker
}
```

### 2. [NEW] Admin Flag Management Page

Add a new page to the admin panel: `src/app/admin/feature-flags/page.tsx`

The admin panel already exists at `src/app/admin/`. Create a page that:

1. **Lists all flags** with their global `enabled` status as toggle switches
2. **Shows override count** per flag
3. **Allows toggling global flag** — `UPDATE feature_flags SET enabled = !enabled WHERE id = ?`
4. **Per-user override management:**
   - Search for a user by nickname
   - Toggle a flag on/off for that specific user
   - Show list of current overrides per flag

Reference the existing admin pages for styling patterns (dark slate theme, `ModernCard` layout, admin guards).

### 3. [MODIFY] Admin navigation

Add a "Feature Flags" link to the admin sidebar/navigation. The admin nav is in the admin layout or a shared admin component — check `src/app/admin/layout.tsx` or the admin sidebar component.

---

## Files to Create/Modify Summary

| Action | File | Description |
|---|---|---|
| NEW | `src/hooks/useFeatureFlag.ts` | Feature flag hook |
| NEW | `src/app/admin/feature-flags/page.tsx` | Admin flag management UI |
| MODIFY | Admin navigation component | Add "Feature Flags" link |
| MIGRATION | Supabase | Tables + RPC + seed data |

---

## Manual Testing Checklist

After implementation, verify each of these manually:

### Database
- [ ] `feature_flags` table exists with `multi_country` and `i18n` rows
- [ ] `user_feature_overrides` table exists and is empty
- [ ] `check_feature_flag('multi_country')` returns `false` for any user
- [ ] RLS: unauthenticated user can SELECT from `feature_flags`
- [ ] RLS: non-admin user CANNOT insert/update/delete `feature_flags`

### Frontend — Hook
- [ ] `useFeatureFlag('multi_country')` returns `{ enabled: false, loading: false }` for a regular user
- [ ] After adding a user override (`enabled: true`), the hook returns `{ enabled: true }` for that user
- [ ] After toggling the global flag to `true`, all users (without overrides) see `enabled: true`
- [ ] A user with `enabled: false` override still sees `false` even when global is `true`

### Admin Panel
- [ ] Feature Flags page loads and shows both flags
- [ ] Toggling a global flag updates immediately
- [ ] Can add a per-user override by searching for a user
- [ ] Override count updates correctly
- [ ] Non-admin users cannot access the Feature Flags page

### Regression — Nothing Broken
- [ ] Login/signup flow works normally
- [ ] Marketplace loads and displays listings
- [ ] Templates page loads
- [ ] Profile completion flow works (nickname → postcode → avatar)
- [ ] Admin panel's existing pages (users, reports, moderation) still work
- [ ] Mobile bottom nav works
- [ ] No new errors in Sentry
