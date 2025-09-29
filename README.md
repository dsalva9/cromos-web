## Features

### Core Functionality

- **User Authentication**: Secure signup/login with Supabase Auth
- **Multi-Collection Support**: Join and manage multiple sticker albums
- **Sticker Inventory Management**: Track owned ("TENGO") and wanted ("QUIERO") stickers
- **Progress Tracking**: Real-time completion percentages and statistics
- **Perfil: gestión de colecciones (propias vs disponibles)**, con añadir/eliminar y marcar activa

### Collection Management

- **Mis Colecciones**: View and manage owned collections with detailed statistics
- **Colecciones Disponibles**: Discover and join new collections
- **Active Collection System**: Set one collection as active for primary tracking
- **Safe Collection Removal**: Confirmation dialogs with cascade delete of user data
- **Auto-Activation**: First collection automatically becomes active

### User Experience

- **Modern Gradient UI**: Teal/cyan/blue theme with responsive design
- **Spanish Interface**: Complete Spanish language support
- **Optimistic Updates**: Immediate UI feedback with background sync
- **Loading States**: Comprehensive loading indicators for all actions
- **Mobile-First**: Responsive design optimized for all screen sizes

### Technical Features

- **Next.js 15**: Modern React framework with App Router
- **TypeScript**: Full type safety throughout the application
- **Supabase**: Real-time database with Row Level Security
- **Tailwind CSS v4**: Modern utility-first styling
- **shadcn/ui**: Accessible component library
## Assets & Backfill

- Supabase buckets `sticker-images` (stickers) and `avatars` (profile pics) power all asset delivery. Bucket creation + policies live in `docs/database-schema.md`.
- Configure `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`, `STICKER_BACKFILL_COLLECTION_ID`, and `STICKER_BACKFILL_INPUT_DIR` (CLI flags can override).
- Run `npm run backfill:stickers -- --input=/path/to/assets --collection=123 --dry-run` to validate mappings without uploads; drop `--dry-run` when ready.
- The script uploads full + thumb WebP files to `sticker-images/{collection_id}/...` and updates `stickers.image_path_webp_300` / `stickers.thumb_path_webp_100`.
- `--force` can re-upload existing assets if a retry is needed; otherwise processed stickers are skipped for safe resumes.
- Rollback: delete objects from Supabase Storage and run `UPDATE stickers SET image_path_webp_300 = NULL, thumb_path_webp_100 = NULL WHERE collection_id = ?` before re-running the script.
- Mi coleccion y vistas detalle ahora leen `image_path_webp_300`/`thumb_path_webp_100` cuando estan disponibles.
