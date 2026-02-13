# IP-Safe Template Deletion: Technical Analysis & Solution

> **Status**: Research / Pre-implementation  
> **Priority**: Medium — not urgent until a real takedown request is received, but should be addressed proactively  
> **Date**: 2026-02-13  
> **Author**: Automated analysis  

---

## Table of Contents

1. [Context](#context)
2. [Current Architecture](#current-architecture)
3. [Problem Analysis](#problem-analysis)
4. [Impact Chain](#impact-chain)
5. [Proposed Solution](#proposed-solution)
6. [Migration Plan](#migration-plan)
7. [Open Questions](#open-questions)

---

## Context

CambioCromos uses a **User-Generated Content (UGC)** model where users create "Collection Templates" (colecciones) that other users can copy and use to track their sticker albums. This was a deliberate architectural decision made in v1.6 to avoid intellectual property concerns.

However, if a rights holder (e.g., Panini) issues a takedown request for a user-created collection that uses their IP, we need to be able to remove the public template **without breaking the experience for users who have already copied it**.

The current system has **critical bugs** in the template deletion flow that would either destroy user data or cause the deletion to fail entirely.

---

## Current Architecture

### Data Model

```
collection_templates          ← Public template ("the mother collection")
  ├── template_pages          ← Pages within the template (e.g., teams)
  │     └── template_slots    ← Individual sticker slots within a page
  └── template_ratings        ← User ratings of the template

user_template_copies          ← User's personal copy of a template ("their album")
  └── user_template_progress  ← Per-slot tracking (has/missing/duplicate + count)
```

### Key Relationships (FK Constraints)

| FK Name | From | To | ON DELETE |
|---|---|---|---|
| `user_template_copies_template_id_fkey` | `user_template_copies.template_id` | `collection_templates.id` | **SET NULL** |
| `user_template_progress_slot_id_fkey` | `user_template_progress.slot_id` | `template_slots.id` | **Unknown (likely RESTRICT)** |
| `user_template_progress_copy_id_fkey` | `user_template_progress.copy_id` | `user_template_copies.id` | **Unknown (likely CASCADE)** |
| `template_slots_page_id_fkey` | `template_slots.page_id` | `template_pages.id` | **Unknown** |

> [!IMPORTANT]
> The ON DELETE behavior of `user_template_progress_slot_id_fkey` is the crux of the problem and **must be verified** on the live database before implementing any fix. Run:
> ```sql
> SELECT
>   tc.constraint_name,
>   tc.table_name,
>   kcu.column_name,
>   ccu.table_name AS foreign_table_name,
>   ccu.column_name AS foreign_column_name,
>   rc.delete_rule
> FROM information_schema.table_constraints AS tc
> JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
> JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name
> JOIN information_schema.constraint_column_usage AS ccu ON rc.unique_constraint_name = ccu.constraint_name
> WHERE tc.constraint_type = 'FOREIGN KEY'
>   AND tc.table_name IN ('user_template_progress', 'user_template_copies', 'template_slots', 'template_pages');
> ```

### Key Computed Column

`user_template_copies.is_orphaned` is a **generated column**:

```sql
is_orphaned boolean GENERATED ALWAYS AS (template_id IS NULL) STORED
```

This automatically becomes `true` when the template is deleted and `template_id` is set to NULL.

---

## Problem Analysis

### Current Deletion Flow

Template deletion happens in **two phases**:

#### Phase 1: Soft Delete — `admin_delete_template(p_template_id, p_reason)`

```sql
UPDATE collection_templates SET
    deleted_at = NOW(),
    deleted_by = v_admin_id,
    deletion_type = 'admin'
WHERE id = p_template_id;
```

- Template is hidden from public searches ✅
- `user_template_copies` are untouched ✅
- User progress is untouched ✅
- A retention schedule entry is created (90-day retention) ✅

**Verdict**: Phase 1 works correctly for user data preservation. However, marketplace functionality is already broken at this point (see Problem 2 below).

#### Phase 2: Hard Delete — `admin_permanently_delete_template(p_template_id)`

```sql
-- Lines 2025-2032 of remote_schema.sql
DELETE FROM template_slots WHERE template_id = p_template_id;  -- ⚠️ CRITICAL
DELETE FROM template_pages WHERE template_id = p_template_id;
DELETE FROM template_ratings WHERE template_id = p_template_id;
DELETE FROM reports WHERE target_type = 'template' AND target_id = p_template_id;
DELETE FROM collection_templates WHERE id = p_template_id;
```

**This is where the bugs are.**

---

### 🔴 Problem 1: Hard delete destroys user progress data (or fails)

The `DELETE FROM template_slots` statement on line 2026 targets all slots belonging to the template. However, `user_template_progress` rows reference these slots via `slot_id` FK.

**Scenario A — FK is CASCADE (most likely given the pattern in the codebase)**:

```
DELETE FROM template_slots WHERE template_id = 42
  → CASCADE deletes all user_template_progress WHERE slot_id IN (deleted slots)
    → ALL users who copied this template LOSE their entire sticker progress
```

Every user who tracked "I have sticker #5, I'm missing sticker #12" for that album **loses all of that data**.

**Scenario B — FK is RESTRICT / NO ACTION (PostgreSQL default)**:

```
DELETE FROM template_slots WHERE template_id = 42
  → ERROR: update or delete on table "template_slots" violates foreign key constraint
    → The hard delete operation FAILS entirely
    → Template remains in limbo (soft-deleted but never hard-deleted)
```

> [!CAUTION]
> **In both scenarios, the result is unacceptable.** Either user data is silently destroyed, or the cleanup process is permanently broken. The FK behavior MUST be verified on the live database.

---

### 🟡 Problem 2: Marketplace availability breaks for orphaned albums

The `get_marketplace_availability` RPC uses **INNER JOINs** that exclude orphaned copies:

```sql
-- From get_marketplace_availability (20260212121900_fix_marketplace_availability_missing_filter.sql)
FROM user_template_copies utc
JOIN collection_templates ct ON ct.id = utc.template_id      -- ❌ INNER JOIN fails when template_id IS NULL
JOIN template_slots ts ON ts.template_id = ct.id              -- ❌ Also depends on template existing
JOIN template_pages tp ON tp.id = ts.page_id                  -- ❌ Chain dependency
```

**Impact**: After a soft delete (Phase 1), users with orphaned albums:
- ❌ Cannot see "X of your missing stickers are available in the marketplace" on their dashboard
- ❌ Cannot navigate from a missing sticker to relevant marketplace listings
- ✅ *Can* still browse their album and track progress (this uses `user_template_progress` directly)
- ✅ *Can* still see existing marketplace listings (listings use `collection_name` text field, not FK)

This problem occurs **even during the 90-day soft delete period**, not just after hard delete.

---

### 🟢 Problem 3 (Minor): Listings survive but lose smart matching

`trade_listings` reference collections by `collection_name` (text field), not by FK. This means:

- Existing listings for "Panini ADRENALYN 25-26" continue to appear in the marketplace ✅
- But the automatic matching between "sticker I'm missing" and "sticker available in marketplace" breaks (see Problem 2) ❌
- Sellers can still create new listings with the same `collection_name` even after the template is deleted ⚠️

---

## Impact Chain

```
Admin soft-deletes template (IP takedown)
├── Template hidden from public search ✅
├── user_template_copies.template_id = SET NULL (is_orphaned = true) ✅
├── user_template_progress PRESERVED ✅
├── get_marketplace_availability BROKEN for these albums ❌ (Problem 2)
│
└── 90 days later: Hard delete triggered
    ├── DELETE FROM template_slots
    │   ├── If CASCADE → user_template_progress DELETED ❌ (Problem 1A)
    │   └── If RESTRICT → Hard delete FAILS ❌ (Problem 1B)
    ├── DELETE FROM template_pages
    └── DELETE FROM collection_templates → SET NULL (already NULL)
```

---

## Proposed Solution

### Strategy: "Disconnect Without Destroying"

The core principle: **when a template is taken down, its structural data (slots/pages) should be preserved as long as any user still references them**, but the template itself should be removed from public visibility.

### Step 1: Fix the Hard Delete Function

Modify `admin_permanently_delete_template` to **NOT delete `template_slots` or `template_pages`** if any user copies still reference the template.

**Option A (Pragmatic — recommended for now):**

Simply skip the slot/page deletion. Leave them as orphaned rows that continue to serve user progress data:

```sql
-- BEFORE (current, broken):
DELETE FROM template_slots WHERE template_id = p_template_id;
DELETE FROM template_pages WHERE template_id = p_template_id;
DELETE FROM template_ratings WHERE template_id = p_template_id;
DELETE FROM collection_templates WHERE id = p_template_id;

-- AFTER (safe):
DELETE FROM template_ratings WHERE template_id = p_template_id;
DELETE FROM reports WHERE target_type = 'template' AND target_id = p_template_id;

-- Only delete structural data if NO users have copies
IF NOT EXISTS (
    SELECT 1 FROM user_template_copies WHERE template_id = p_template_id
) THEN
    DELETE FROM template_slots WHERE template_id = p_template_id;
    DELETE FROM template_pages WHERE template_id = p_template_id;
END IF;

-- This SET NULLs template_id in user_template_copies (making them orphaned)
DELETE FROM collection_templates WHERE id = p_template_id;

-- Note: After SET NULL, the slots/pages are orphaned too (their template_id
-- still points to the now-deleted template). They become unreachable except
-- via user_template_progress.slot_id, which is exactly what we want.
```

> [!WARNING]
> After the `DELETE FROM collection_templates`, the `template_slots` and `template_pages` rows become soft-orphaned (their `template_id` FK references a non-existent row or would need to be SET NULL too). We need to verify the FK behavior on `template_slots.template_id` → `collection_templates.id` as well. If it's CASCADE, those slots get deleted anyway and we need to change the FK to SET NULL.

**Option B (Complete — for future consideration):**

Create independent snapshot tables when a user copies a template:

```
user_copy_pages   ← Independent copy of pages
user_copy_slots   ← Independent copy of slots
```

This fully decouples user data from template data. Templates can be freely deleted with no side effects. However, this requires:
- Schema migration to create new tables
- Data migration to copy existing `template_pages`/`template_slots` data into user-owned tables
- Updating all RPCs and frontend queries that currently join through `template_slots`
- Significantly more storage

**Recommendation**: Implement **Option A now**, consider Option B as part of a larger architecture overhaul (e.g., when implementing LATAM expansion where album data independence would be beneficial).

### Step 2: Fix `get_marketplace_availability`

Change the INNER JOINs to handle orphaned copies gracefully:

```sql
-- BEFORE:
FROM user_template_copies utc
JOIN collection_templates ct ON ct.id = utc.template_id
JOIN template_slots ts ON ts.template_id = ct.id

-- AFTER:
FROM user_template_copies utc
LEFT JOIN collection_templates ct ON ct.id = utc.template_id
-- For orphaned copies, get slots via the original template_id stored before SET NULL
-- Since slots still exist (after fix in Step 1), we can join them
JOIN template_slots ts ON ts.template_id = COALESCE(ct.id, utc.template_id)
```

However, since `utc.template_id` is NULL after deletion, we need an alternative reference. **This requires storing the original `template_id` in a separate column before it gets SET NULL**:

```sql
-- Add a column that preserves the original template_id even after SET NULL
ALTER TABLE user_template_copies
ADD COLUMN original_template_id BIGINT;

-- Backfill existing data
UPDATE user_template_copies
SET original_template_id = template_id
WHERE template_id IS NOT NULL;

-- Add a trigger to auto-populate on insert
CREATE OR REPLACE FUNCTION set_original_template_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.original_template_id := COALESCE(NEW.original_template_id, NEW.template_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Then `get_marketplace_availability` can use:

```sql
JOIN template_slots ts ON ts.template_id = COALESCE(utc.template_id, utc.original_template_id)

-- And for collection_name matching:
AND tl.collection_name = COALESCE(ct.title, utc.title)
```

### Step 3: Verify and fix related RPCs

The following RPCs also JOIN through `collection_templates` and would be affected by orphaned copies:

| RPC | Issue | Fix |
|---|---|---|
| `get_marketplace_availability` | INNER JOIN on `collection_templates` | Change to LEFT JOIN + COALESCE |
| `get_filtered_listings_v4` | Collects `template_ids` from user copies | May need similar LEFT JOIN fix |
| `get_user_collections` | Already filters `template_id IS NOT NULL` | Review if orphaned albums should still appear |

---

## Migration Plan

### Migration 1: Add `original_template_id` column

```sql
-- Add persistent reference column
ALTER TABLE user_template_copies
ADD COLUMN IF NOT EXISTS original_template_id BIGINT;

-- Backfill from existing data
UPDATE user_template_copies
SET original_template_id = template_id
WHERE original_template_id IS NULL AND template_id IS NOT NULL;

-- Create trigger for future inserts
CREATE OR REPLACE FUNCTION set_original_template_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.original_template_id IS NULL THEN
        NEW.original_template_id := NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_original_template_id
BEFORE INSERT ON user_template_copies
FOR EACH ROW
EXECUTE FUNCTION set_original_template_id();
```

### Migration 2: Fix `admin_permanently_delete_template`

Replace the slot/page deletion with conditional deletion (only if no copies exist). See Step 1 above.

### Migration 3: Fix `get_marketplace_availability`

Update to use LEFT JOIN and COALESCE pattern. See Step 2 above.

### Migration 4 (Optional): Fix FK constraints

```sql
-- If template_slots.template_id → collection_templates.id is CASCADE,
-- change it to SET NULL so slots survive template deletion
ALTER TABLE template_slots
DROP CONSTRAINT IF EXISTS template_slots_template_id_fkey,
ADD CONSTRAINT template_slots_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES collection_templates(id)
    ON DELETE SET NULL;

-- Same for template_pages
ALTER TABLE template_pages
DROP CONSTRAINT IF EXISTS template_pages_template_id_fkey,
ADD CONSTRAINT template_pages_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES collection_templates(id)
    ON DELETE SET NULL;

-- Requires template_slots.template_id and template_pages.template_id to be nullable
ALTER TABLE template_slots ALTER COLUMN template_id DROP NOT NULL;
ALTER TABLE template_pages ALTER COLUMN template_id DROP NOT NULL;
```

---

## Open Questions

1. **What is the actual ON DELETE behavior of `user_template_progress_slot_id_fkey`?**  
   Must be verified with the SQL query in the [Key Relationships](#key-relationships-fk-constraints) section above. This determines whether Problem 1 is Scenario A (silent data loss) or Scenario B (operation failure).

2. **Should orphaned albums still appear in `get_user_collections`?**  
   Currently, the RPC filters with `AND utc.template_id IS NOT NULL`, which means orphaned albums are **hidden from the user's album list**. This might be intentional (hide albums whose template was removed) or a bug (users lose access to albums they were using). Needs a product decision.

3. **Should we prevent new listings for a taken-down collection?**  
   Currently, since listings use `collection_name` (text), users can still create listings mentioning a removed collection. Do we need a blocklist for collection names under takedown?

4. **What about storage (sticker images)?**  
   If the template had user-uploaded sticker images in `sticker-images/{template_id}/`, those would need separate cleanup consideration. The current `admin_delete_collection` function comments note: *"Storage cleanup must be done by client after RPC returns."*

5. **Do we need a formal DMCA/DSA takedown procedure page?**  
   For legal compliance, having a public-facing process (e.g., `cambiocromos.com/legal/takedown`) strengthens the safe harbor defense.

---

## References

- [admin_permanently_delete_template](file:///c:/Users/dsalv/Projects/cromos-web/supabase/migrations/20260206133312_remote_schema.sql#L1930-L2046) — Current hard delete function
- [admin_delete_template](file:///c:/Users/dsalv/Projects/cromos-web/supabase/migrations/20260206133312_remote_schema.sql#L918-L1029) — Current soft delete function
- [get_marketplace_availability](file:///c:/Users/dsalv/Projects/cromos-web/supabase/migrations/20260212121900_fix_marketplace_availability_missing_filter.sql) — Marketplace availability RPC
- [copy_template](file:///c:/Users/dsalv/Projects/cromos-web/supabase/migrations/20260206133312_remote_schema.sql#L4925-L5003) — Template copy function
- [user_template_copies table](file:///c:/Users/dsalv/Projects/cromos-web/supabase/migrations/20260206133312_remote_schema.sql#L13746-L13768) — Table definition with is_orphaned computed column
- [fix_collection_name_and_filter](file:///c:/Users/dsalv/Projects/cromos-web/supabase/migrations/20260211091739_fix_collection_name_and_filter.sql) — get_user_collections filters orphaned copies
