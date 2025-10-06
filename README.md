## Features

### Core Collection Management

- **User Authentication**: Secure signup/login with Supabase Auth
- **Multi-Collection Support**: Join and manage multiple sticker albums
- **Sticker Inventory Management**: Owned ("TENGO"), duplicates ("REPES"), and missing ("FALTAN") tracking.
- **Progress Tracking**: Real-time completion percentages and statistics
- **Zero-Reload Profile**: Add, remove, and activate collections with instant UI feedback and no page reloads.

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
- **RPC-First Architecture**: All complex business logic is handled by 14 secure and performant database functions.
- **Row Level Security**: 25 granular RLS policies ensure users can only access their own data.
- **Tailwind CSS v4**: Modern utility-first styling
- **shadcn/ui**: Accessible component library

## Assets & Backfill

- Supabase buckets `sticker-images` (stickers) and `avatars` (profile pics) power all asset delivery. Bucket creation + policies live in `docs/database-schema.md`.
- Configure `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`, `STICKER_BACKFILL_COLLECTION_ID`, and `STICKER_BACKFILL_INPUT_DIR` (CLI flags can override).
- Run `npm run backfill:stickers -- --input=/path/to/assets --collection=123 --dry-run` to validate mappings without uploads; drop `--dry-run` when ready.
- The script uploads full + thumb WebP files to `sticker-images/{collection_id}/...` and updates `stickers.image_path_webp_300` / `stickers.thumb_path_webp_100`.
- `--force` can re-upload existing assets if a retry is needed; otherwise processed stickers are skipped for safe resumes.
- Rollback: delete objects from Supabase Storage and run `UPDATE stickers SET image_path_webp_300 = NULL, thumb_path_webp_100 = NULL WHERE collection_id = ?` before re-running the script.
- The album view and sticker details now read from `image_path_webp_300`/`thumb_path_webp_100` when available.
