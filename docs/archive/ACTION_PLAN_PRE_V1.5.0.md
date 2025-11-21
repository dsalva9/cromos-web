# Pre-v1.5.0 Action Plan

**Priority**: Critical fixes before starting v1.5.0 implementation
**Estimated Time**: 1 day
**Date**: 2025-10-08

---

## 🔴 Must-Fix Before v1.5.0 Coding

### 1. Duplicate Supabase Client (2 hours)

**Problem**: Two separate Supabase client instances causing memory waste and potential state issues.

**Action**:
```bash
# Delete duplicate client
rm src/lib/supabase/client.ts

# Audit all imports
grep -r "from '@/lib/supabase/client'" src/ --include="*.ts" --include="*.tsx"

# Replace with useSupabase() hook
```

**Files to check**: Any file importing `@/lib/supabase/client`

---

### 2. Create Batch RPC for Collection Stats (3 hours)

**Problem**: N+1 query pattern in useProfileData (5 collections = 5 RPC calls)

**Action**:

**Step 1**: Create SQL function in Supabase:

```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_multiple_user_collection_stats(
  p_user_id UUID,
  p_collection_ids BIGINT[]
)
RETURNS TABLE (
  collection_id BIGINT,
  total_stickers INT,
  owned_stickers INT,
  completion_percentage INT,
  duplicates INT,
  missing INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS collection_id,
    COUNT(s.id)::INT AS total_stickers,
    COUNT(DISTINCT CASE WHEN us.count > 0 THEN s.id END)::INT AS owned_stickers,
    ROUND((COUNT(DISTINCT CASE WHEN us.count > 0 THEN s.id END)::NUMERIC / NULLIF(COUNT(s.id), 0)) * 100)::INT AS completion_percentage,
    COALESCE(SUM(GREATEST(us.count - 1, 0)), 0)::INT AS duplicates,
    (COUNT(s.id) - COUNT(DISTINCT CASE WHEN us.count > 0 THEN s.id END))::INT AS missing
  FROM collections c
  LEFT JOIN stickers s ON s.collection_id = c.id
  LEFT JOIN user_stickers us ON us.sticker_id = s.id AND us.user_id = p_user_id
  WHERE c.id = ANY(p_collection_ids)
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test it
SELECT * FROM get_multiple_user_collection_stats(
  'user-uuid-here',
  ARRAY[1, 2, 3]::BIGINT[]
);
```

**Step 2**: Update useProfileData.ts:

```typescript
// Around line 243-278
const collectionIds = validCollections.map(c => c.id);

if (collectionIds.length > 0) {
  const { data: allStats } = await supabase.rpc(
    'get_multiple_user_collection_stats',
    { p_user_id: user.id, p_collection_ids: collectionIds }
  );

  const ownedWithStats = validCollections.map(collection => {
    const stats = allStats?.find(s => s.collection_id === collection.id);
    return {
      ...collection,
      is_user_active: collection.is_user_active,
      joined_at: collection.joined_at,
      stats: stats ? normalizeCollectionStats(stats) : {...}
    } as UserCollection;
  });

  setOwnedCollections(ownedWithStats);
} else {
  setOwnedCollections([]);
}
```

**Step 3**: Update useAlbumPages softRefresh (line 339-374) with same pattern.

**Performance Gain**: 5-10x faster for users with multiple collections

---

### 3. Add Error Boundary (1 hour)

**Problem**: No error boundary → entire app crashes on unhandled errors

**Action**:

**Step 1**: Create ErrorBoundary component:

```typescript
// src/components/ErrorBoundary.tsx
'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#1F2937] px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Lo sentimos, ha ocurrido un error inesperado.
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2**: Add to layout.tsx:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <SupabaseProvider>
          <ErrorBoundary>
            <SiteHeader />
            <main>{children}</main>
            <footer>...</footer>
          </ErrorBoundary>
          <Toaster />
        </SupabaseProvider>
      </body>
    </html>
  );
}
```

---

### 4. Replace console.log with Logger (1 hour)

**Problem**: 66 console statements will run in production

**Action**:

**Step 1**: Create logger utility:

```typescript
// src/lib/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
    // TODO v1.5.1: Send to error tracking service
  },
};
```

**Step 2**: Find and replace:

```bash
# Find all console statements
grep -rn "console\." src/ --include="*.ts" --include="*.tsx"

# Replace:
# console.log → logger.debug
# console.info → logger.info
# console.warn → logger.warn
# console.error → logger.error
```

**Files with most console usage** (prioritize these):
- src/hooks/profile/useProfileData.ts
- src/hooks/album/useAlbumPages.ts
- src/hooks/trades/*.ts
- src/app/mi-coleccion/page.tsx

---

### 5. Update ESLint Config (30 min)

**Problem**: Lax linting rules allow potential issues

**Action**:

Update `.eslintrc.json`:

```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "react-hooks/exhaustive-deps": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-floating-promises": "error",
    "react/no-unescaped-entities": "error"
  }
}
```

Run lint:

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

---

## ✅ Verification Checklist

Before starting v1.5.0 implementation:

- [ ] No duplicate Supabase client (only SupabaseProvider)
- [ ] Batch RPC function deployed to Supabase
- [ ] useProfileData uses batch RPC (test with 5+ collections)
- [ ] useAlbumPages softRefresh uses batch RPC
- [ ] ErrorBoundary added to layout.tsx
- [ ] Logger utility created and used
- [ ] All console.log replaced with logger.debug
- [ ] ESLint config updated
- [ ] All lint errors fixed
- [ ] Manual test: Profile page loads < 1s with 5 collections
- [ ] Manual test: Error boundary catches thrown errors
- [ ] Git commit with all changes

---

## 🧪 Testing Script

Run these tests to verify fixes:

```bash
# 1. Build succeeds
npm run build

# 2. No lint errors
npm run lint

# 3. No TypeScript errors
npx tsc --noEmit

# 4. Manual tests
npm run dev

# Test cases:
# - Load profile page with 5+ collections (should be < 1s)
# - Throw error in a component (ErrorBoundary should catch)
# - Check browser console (no console.log in production build)
```

---

## 📊 Success Metrics

**Before**:
- Profile load (5 collections): ~2s
- 66 console statements in production
- 2 Supabase client instances
- No error handling

**After**:
- Profile load (5 collections): <800ms (60% improvement)
- 0 console.log statements in production
- 1 Supabase client instance
- Graceful error handling with ErrorBoundary

---

## 🎯 Next Steps After Completion

1. ✅ Commit changes:
   ```bash
   git add -A
   git commit -m "perf: critical fixes before v1.5.0 - batch RPCs, ErrorBoundary, logger"
   ```

2. ✅ Update TODO.md to mark these items complete

3. ✅ Begin v1.5.0 implementation:
   - Admin Backoffice → Badges UI → Quick Entry → Avatar Seed

4. ✅ Schedule post-v1.5.0 improvements:
   - TanStack Query integration
   - Code splitting
   - Image optimization
   - Unit tests

---

**Estimated Total Time**: ~7.5 hours (1 working day)
**Priority**: Critical
**Status**: Ready to implement
