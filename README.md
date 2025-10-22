# CambioCromos v1.6.0-alpha

> **Spanish-language marketplace and community platform for sports cards**

**Current State**: Backend migration complete, frontend pending

---

## 🎯 Project Overview

CambioCromos is pivoting from a traditional sticker collection app to a Spanish-language marketplace and community platform for sports cards. This project is a complete rewrite of the backend architecture to support a neutral marketplace model with community-generated content.

### 🔄 Pivot Summary (v1.6.0)

**From**: Official collections system with automatic matching
**To**: Neutral marketplace with community templates

**Legal Model**: Neutral hosting (LSSI/DSA compliant)
**Focus**: User-to-user trading with community collections

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Deployment](#-deployment)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Marketplace System

- **Physical Card Listings**: Free-form marketplace listings
- **Direct Chat**: Real-time messaging between buyers and sellers
- **Search & Filtering**: Full-text search on title and collection name
- **Status Management**: Active, sold, and removed listing states
- **Photo Uploads**: Optional real photos for listings

### Collection Templates System

- **Community Templates**: User-created collection structures
- **Public/Private Templates**: Authors control visibility
- **Copy System**: Users can copy public templates
- **Progress Tracking**: HAVE/NEED/DUPES for each slot
- **Rating System**: Community ratings with distribution

### Marketplace-Template Integration

- **Template-Linked Listings**: Listings can reference template copies and slots
- **Publish Duplicates**: Users can publish duplicate cards to marketplace
- **Sync Management**: Track sync between listings and template progress
- **Automatic Count Management**: Updates counts on publish/sale

### Social and Reputation System

- **Favourites**: Users can favourite listings, templates, and users
- **User Ratings**: Post-transaction ratings with aggregation
- **Template Ratings**: Community ratings with distribution
- **Reports System**: Universal reporting for all content types

### Admin Moderation System

- **Audit Logging**: Comprehensive audit trail for all moderation actions
- **Dashboard Statistics**: Overview of platform metrics
- **Bulk Actions**: Efficient handling of multiple items
- **Performance Metrics**: Admin activity tracking

### Trading System (Legacy)

- **Trade Proposals**: Interactive trading system
- **Real-time Chat**: In-app messaging for trades
- **Trade History**: Complete transaction history
- **Finalization System**: Two-step trade completion

---

## 🏗️ Architecture

### Backend Stack

- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **API**: Supabase Functions (RPC)
- **Realtime**: Supabase Realtime

### Frontend Stack (Planned)

- **Framework**: Next.js 14
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: React Context + Custom Hooks
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

### Security Model

- **Row Level Security**: Database-level permissions
- **Admin Role System**: Role-based access control
- **Audit Logging**: Complete action tracking
- **Input Validation**: Server-side validation for all inputs

---

## 🗄️ Database Schema

### Core Tables

- **profiles**: User profiles with ratings and admin status
- **trade_listings**: Marketplace listings
- **collection_templates**: Community-created templates
- **template_pages**: Pages within templates
- **template_slots**: Individual slots within pages
- **user_template_copies**: User copies of templates
- **user_template_progress**: Progress tracking for each slot

### Social Tables

- **favourites**: Unified favourites for all entity types
- **user_ratings**: User-to-user ratings
- **template_ratings**: Template ratings
- **reports**: Universal reporting system

### Admin Tables

- **audit_log**: Append-only log of all admin actions
- **notifications**: User notification system

### Trading Tables (Legacy)

- **trade_proposals**: Trade proposals between users
- **trade_proposal_items**: Items in trade proposals
- **trade_chats**: Chat messages
- **trades_history**: Completed trades
- **trade_finalizations**: Finalization tracking

For detailed schema documentation, see [docs/database-schema.md](docs/database-schema.md).

---

## 🔌 API Endpoints

### Marketplace Functions

- `create_trade_listing(title, description, sticker_number, collection_name, image_url)`
- `list_trade_listings(limit, offset, search)`
- `get_user_listings(user_id, limit, offset)`
- `update_listing_status(listing_id, new_status)`
- `get_listing_chats(listing_id)`
- `send_listing_message(listing_id, message)`

### Template Functions

- `create_template(title, description, image_url, is_public)`
- `add_template_page(template_id, title, type, slots)`
- `publish_template(template_id, is_public)`
- `list_public_templates(limit, offset, search, sort_by)`
- `copy_template(template_id, custom_title)`
- `get_my_template_copies()`
- `get_template_progress(copy_id)`
- `update_template_progress(copy_id, slot_id, status, count)`

### Integration Functions

- `publish_duplicate_to_marketplace(copy_id, slot_id, title, description, image_url)`
- `mark_listing_sold_and_decrement(listing_id)`
- `get_my_listings_with_progress(status)`

### Social Functions

- `toggle_favourite(target_type, target_id)`
- `is_favourited(target_type, target_id)`
- `get_favourite_count(target_type, target_id)`
- `get_user_favourites(target_type, limit, offset)`
- `create_user_rating(rated_id, rating, comment, context_type, context_id)`
- `update_user_rating(rating_id, rating, comment)`
- `delete_user_rating(rating_id)`
- `get_user_ratings(user_id, limit, offset)`
- `get_user_rating_summary(user_id)`
- `create_template_rating(template_id, rating, comment)`
- `update_template_rating(rating_id, rating, comment)`
- `delete_template_rating(rating_id)`
- `get_template_ratings(template_id, limit, offset)`
- `get_template_rating_summary(template_id)`
- `create_report(target_type, target_id, reason, description)`
- `get_reports(status, target_type, limit, offset)`
- `update_report_status(report_id, status, admin_notes)`
- `get_user_reports(status, limit, offset)`
- `check_entity_reported(target_type, target_id)`

### Admin Functions

- `log_moderation_action(moderation_action_type, moderated_entity_type, moderated_entity_id, moderation_reason, old_values, new_values)`
- `get_moderation_audit_logs(moderation_action_type, moderated_entity_type, admin_id, limit, offset)`
- `get_entity_moderation_history(entity_type, entity_id)`
- `admin_update_user_role(user_id, is_admin, reason)`
- `admin_suspend_user(user_id, is_suspended, reason)`
- `admin_delete_user(user_id, reason)`
- `admin_delete_content(content_type, content_id, reason)`
- `get_admin_dashboard_stats()`
- `get_recent_reports(limit)`
- `get_moderation_activity(limit)`
- `get_report_statistics()`
- `get_admin_performance_metrics(days_back)`
- `bulk_update_report_status(report_ids, status, admin_notes)`
- `bulk_suspend_users(user_ids, is_suspended, reason)`
- `bulk_delete_content(content_type, content_ids, reason)`
- `escalate_report(report_id, priority_level, reason)`

For complete API documentation, see [docs/api-endpoints.md](docs/api-endpoints.md).

---

## 🚀 Deployment

### Environment Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/cambiocromos.git
   cd cambiocromos
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run all migration files in order
   - Set up storage buckets for images

4. **Configure environment variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### Database Migration

Run all migration files in order:

```bash
# Phase 0: Cleanup
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251010000000_cleanup.sql

# Sprint 1: Marketplace
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251010100000_marketplace.sql

# Sprint 2: Templates
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251010200000_templates.sql

# Sprint 3: Integration
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251010300000_integration.sql

# Sprint 4: Social
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251020120000_create_favourites_system.sql
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251020130000_create_user_ratings_system.sql
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251020140000_create_template_ratings_system.sql
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251020150000_create_reports_system.sql

# Sprint 5: Admin Moderation
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251020160000_extend_audit_log_for_moderation.sql
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251020170000_extend_moderation_rpcs_with_audit.sql
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251020180000_create_admin_dashboard_rpcs.sql
supabase db push --db-url postgresql://user:password@host:port/dbname migrations/20251020190000_create_moderation_action_rpcs.sql
```

### Storage Setup

Create storage buckets:

```sql
-- Create sticker-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sticker-images', 'sticker-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);
```

---

## 💻 Development

### Local Development

1. **Start the development server**

   ```bash
   npm run dev
   ```

2. **View the application**
   Open [http://localhost:3000](http://localhost:3000)

### Code Style

- **ESLint**: Follows Next.js recommended configuration
- **Prettier**: Standardized code formatting
- **TypeScript**: Strict type checking enabled

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 🤝 Contributing

We welcome contributions! Please follow our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. **Backend**: Database changes via Supabase migrations
2. **Frontend**: Component-based development with TypeScript
3. **Testing**: Unit tests for utilities, integration tests for RPCs
4. **Documentation**: Update docs with every new feature

---

## 📝 Documentation

- [Database Schema](docs/database-schema.md)
- [API Endpoints](docs/api-endpoints.md)
- [Current Features](docs/current-features.md)
- [UI Improvements Sprint](docs/ui-improvements-sprint.md)
- [Change Log](CHANGELOG.md)
- [TODO List](TODO.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🗺️ Roadmap

### v1.6.0-alpha (Current)

- ✅ Backend migration complete
- ✅ High-priority UI improvements implemented
  - Enhanced progress bars with gradients and glow effects
  - Stat boxes with color-coded icons (TENGO/REPES/FALTAN)
  - Smooth hover states for all cards
  - Prominent completion percentages
  - Comprehensive skeleton loaders
  - Loading states integrated across all major pages
- ⏳ Frontend development in progress

### v1.6.0-beta (Planned)

- Marketplace UI implementation
- Templates UI implementation
- Social UI implementation
- Admin Moderation UI implementation

### v1.7.0 (Future)

- Mobile app development
- Advanced search features
- Recommendation system
- Premium features

---

## 📞 Contact

For questions or support:

- **Email**: support@cambiocromos.com
- **Issues**: [GitHub Issues](https://github.com/yourusername/cambiocromos/issues)
- **Discord**: [Join our Discord](https://discord.gg/cambiocromos)

---

**Last Updated**: 2025-10-22
**Version**: v1.6.0-alpha
**Status**: Backend Complete, UI Improvements In Progress
