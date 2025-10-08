## Features

### Core Collection Management

- **User Authentication**: Secure signup/login with Supabase Auth
- **Multi-Collection Support**: Join and manage multiple sticker albums
- **Sticker Inventory Management**: Owned ("TENGO"), duplicates ("REPES"), and missing ("FALTAN") tracking.
- **Progress Tracking**: Real-time completion percentages and statistics
- **Zero-Reload Profile**: Add, remove, and activate collections with instant UI feedback and no page reloads.
- **Quick Entry** ✅ **NEW (v1.5.0)**: "Abrir un sobre" - Add 1-5 stickers fast by typing their numbers.

### Album Pages System (v1.3.0)

- **Interactive Album View**: Navigate your collection like a real sticker album with page-by-page views.
- **Team & Special Pages**: View structured team pages (20 slots) and special edition pages.
- **Visual Completion**: See your owned stickers appear in their slots, with placeholders for missing ones.
- **Optimized Image Display**: Fast-loading WebP images with a graceful fallback system to prevent layout shifts.

### Advanced Trading System (v1.1.0 - v1.2.0)

- **Find Mutual Trades**: Discover other users who have stickers you want and want stickers you have.
- **Advanced Filtering**: Search for trading partners by player name, team, and rarity.
- **Create Complex Proposals**: Offer and request multiple stickers in a single trade proposal.
- **Inbox/Outbox Dashboard**: Manage all your incoming and outgoing trade proposals in one place.
- **Respond to Trades**: Accept, reject, or cancel proposals with a single click.

### Admin Backoffice (MVP) ✅ **NEW (v1.5.0)**

- **Role-Based Access Control**: Admin-only dashboard with JWT claims enforcement.
- **Collections Management**: Create, edit, publish/draft, and delete collections.
- **Pages Management**: CRUD for team and special pages with slot assignment.
- **Stickers Management**: Full CRUD with image uploads (WebP conversion + thumbnails).
- **Bulk Upload**: CSV/XLSX preview → apply workflow with validation and error reporting.
- **Audit Log**: Append-only log of all admin actions (create/update/delete).

### Badges & Avatars ✅ **NEW (v1.5.0)**

- **Badges (Read-only)**: Display user achievement badges in profile page.
- **Avatar Seed Picker**: Choose from 12 seed avatars in profile (uploads deferred to Phase B).

### User Experience

- **Retro-Comic UI Design**: A bold, high-contrast, dark theme inspired by retro comic books and stickers.
- **Dark Mode First**: Solid deep charcoal/navy background (`bg-[#1F2937]`) across the entire application.
- **High-Contrast Components**: Chunky cards and buttons with thick black borders and bold accent colors (Gold `#FFC000` and Red `#E84D4D`).
- **Spanish Interface**: Complete Spanish language support
- **Optimistic Updates**: Immediate UI feedback with background sync
- **Loading States**: Comprehensive loading indicators for all actions
- **Mobile-First**: Responsive design optimized for all screen sizes

### Technical Features

- **Next.js 15**: React framework with App Router
- **TypeScript**: Full type safety throughout the application
- **Supabase**: Backend-as-a-Service with a real-time PostgreSQL database, authentication, and storage.
- **RPC-First Architecture**: All complex business logic is handled by secure and performant SECURITY DEFINER database functions.
- **Row Level Security**: Granular RLS policies ensure users can only access their own data.
- **Admin RBAC** ✅ **NEW (v1.5.0)**: Admin RPCs enforce `is_admin = TRUE` in JWT claims + RLS enabled.
- **Tailwind CSS v4**: Modern utility-first styling
- **shadcn/ui**: Accessible component library

### Technical Notes (v1.5.0)

- **SECURITY DEFINER Admin RPCs**: All admin operations use SECURITY DEFINER functions with explicit JWT claims validation (`is_admin = TRUE`). RLS remains enabled for defense in depth.
- **Audit Log**: All admin actions (create/update/delete) are logged in the append-only `audit_log` table for compliance and debugging.
- **Testing**: Playwright test refactor and CI re-enable deferred to v1.5.2 to focus on feature delivery.

## Assets & Backfill

### Image Management (v1.5.0 Update)

- **Supabase buckets**: `sticker-images` (stickers) and `avatars` (profile pics + seed avatars) power all asset delivery. Bucket creation + policies live in `docs/database-schema.md`.
- **Admin Backoffice** ✅ **NEW**: Uploads now flow through Admin UI bulk upload wizard.
  - Client-side WebP conversion + 100px thumbnail generation
  - Automatic population of `image_path_webp_300` and `thumb_path_webp_100`
  - Validation and preview before applying changes
- **CLI Backfill Script** (legacy, still available):
  - Configure `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`, `STICKER_BACKFILL_COLLECTION_ID`, and `STICKER_BACKFILL_INPUT_DIR` (CLI flags can override).
  - Run `npm run backfill:stickers -- --input=/path/to/assets --collection=123 --dry-run` to validate mappings without uploads; drop `--dry-run` when ready.
  - The script uploads full + thumb WebP files to `sticker-images/{collection_id}/...` and updates `stickers.image_path_webp_300` / `stickers.thumb_path_webp_100`.
  - `--force` can re-upload existing assets if a retry is needed; otherwise processed stickers are skipped for safe resumes.
- **Rollback**: delete objects from Supabase Storage and run `UPDATE stickers SET image_path_webp_300 = NULL, thumb_path_webp_100 = NULL WHERE collection_id = ?` before re-running the script.
- **Sticker Numbers**: Now optional (can be added progressively via Admin Backoffice).
