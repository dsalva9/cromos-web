# Sprint 15: Notifications System - Quick Reference

## At a Glance

**What was implemented:** Unified notification system for marketplace, templates, and ratings
**When:** October 25, 2025
**Status:** ✅ Complete

## For Developers

### Using Notifications in Components

```tsx
import { useNotifications } from '@/hooks/notifications/useNotifications';

function MyComponent() {
  const {
    notifications,        // All formatted notifications
    unreadCount,          // Number of unread
    loading,              // Loading state
    markAsRead,           // Mark single as read
    markAllAsRead,        // Mark all as read
  } = useNotifications();

  return (
    <div>
      <p>You have {unreadCount} unread notifications</p>
      {notifications.map(notif => (
        <div key={notif.id}>{notif.title}</div>
      ))}
    </div>
  );
}
```

### Notification Types

| Kind | Trigger | Category | Example |
|------|---------|----------|---------|
| `listing_chat` | Someone sends chat message | Marketplace | "Juan te ha enviado un mensaje" |
| `listing_reserved` | Listing reserved | Marketplace | "María ha reservado 'Cromo Messi' para ti" |
| `listing_completed` | Transaction completed | Marketplace | "Tu compra se ha completado" |
| `user_rated` | User receives rating | Community | "Pedro te ha valorado con ⭐⭐⭐⭐⭐" |
| `template_rated` | Template receives rating | Templates | "Ana ha valorado tu plantilla" |

### Database Schema

**Key Columns:**
- `user_id` - Recipient of notification
- `kind` - Type of notification (see table above)
- `actor_id` - User who triggered it
- `listing_id`, `template_id`, `rating_id`, `trade_id` - Related entities
- `payload` - JSONB with additional data
- `read_at` - NULL if unread, timestamp if read

**Key Indexes:**
- Unique on `(user_id, kind, listing_id, template_id, rating_id, trade_id)` WHERE `read_at IS NULL`
- Prevents duplicate unread notifications

### API Endpoints (RPCs)

```sql
-- Get all notifications for current user
SELECT * FROM get_notifications();

-- Get unread count
SELECT get_notification_count();

-- Mark single notification as read
SELECT mark_notification_read(123);

-- Mark all as read
SELECT mark_all_notifications_read();

-- Mark listing chat notifications as read
SELECT mark_listing_chat_notifications_read(456, 'user-uuid');
```

### File Locations

```
Database:
  supabase/migrations/20251025194614_notifications_reboot.sql
  supabase/migrations/20251025194615_notifications_listing_workflow.sql

Frontend:
  src/types/notifications.ts              # Type definitions
  src/lib/supabase/notifications.ts       # Supabase client
  src/lib/notifications/formatter.ts      # Message formatting
  src/hooks/notifications/useNotifications.ts  # React hook
  src/components/notifications/NotificationCard.tsx
  src/components/notifications/NotificationDropdown.tsx
  src/app/profile/notifications/page.tsx  # Notifications center

Documentation:
  docs/sprints/SPRINT 15 NOTIFICATIONS SYSTEM/
    ├── SPRINT-15-IMPLEMENTATION-SUMMARY.md
    ├── MANUAL-TESTING-GUIDE.md
    └── QUICK-REFERENCE.md (this file)
```

## For Testers

### Key User Flows to Test

1. **Listing Chat Notification**
   - User B sends message to User A's listing
   - User A sees notification in bell icon
   - Clicking notification opens chat
   - Notification marked as read

2. **Listing Reservation**
   - User A reserves listing for User B
   - Both receive notifications
   - Status updates reflected

3. **Rating Notification**
   - User B rates User A after transaction
   - User A receives notification with star count

### Test URLs

- Notifications Center: `/profile/notifications`
- Bell Icon: Top-right of header (when logged in)

### Common Issues to Check

- [ ] Notifications appear in realtime (within 2-3 seconds)
- [ ] No duplicate notifications for same event
- [ ] Mark as read works correctly
- [ ] Spanish language consistent throughout
- [ ] Mobile responsive

## For Product/PM

### What Users See

**Header Bell Icon:**
- Shows unread count as badge
- Dropdown with 5 most recent notifications
- Action buttons directly in dropdown (e.g., "Ir al chat", "Confirmar transacción", "Valorar usuario")
- No need to navigate to full page to interact with notifications
- "Ver todas" link to full notifications center for viewing all notifications

**Notifications Center** (`/profile/notifications`):
- Two tabs: "Nuevas" (unread) and "Historial" (read)
- Grouped by category: Marketplace, Plantillas, Comunidad, Intercambios
- Each notification shows:
  - Icon or actor avatar
  - Title and description in Spanish
  - Relative timestamp (e.g., "hace 5 minutos")
  - Quick action button (e.g., "Ir al chat")
- "Marcar todas como leídas" button

### Notification Messages (Examples)

All in Spanish, retro-comic tone:

- **Chat:** "Juan te ha enviado un mensaje sobre 'Cromo Ronaldo'"
- **Reserved:** "María ha reservado 'Pack Completo' para ti"
- **Completed:** "Tu compra de 'Album Vintage' se ha completado"
- **Rated:** "Pedro te ha valorado con ⭐⭐⭐⭐⭐ (5/5)"
- **Template Rated:** "Ana ha valorado tu plantilla 'La Liga' con ⭐⭐⭐⭐"

## Performance Notes

- **Realtime:** Supabase Realtime channels used for instant updates
- **Deduplication:** Unique index prevents notification spam
- **Optimistic Updates:** UI updates immediately, syncs with server
- **Lazy Loading:** Notifications fetched on demand

## Migration Checklist

When deploying to production:

1. [ ] Apply migrations: `supabase db push`
2. [ ] Verify all triggers exist
3. [ ] Test notifications in staging environment
4. [ ] Ensure Supabase Realtime is enabled
5. [ ] Monitor for any RLS policy issues
6. [ ] Check database performance (indexes)

## Support & Troubleshooting

### Common Issues

**Notifications not appearing:**
- Check Supabase Realtime status
- Verify triggers are active: `SELECT * FROM pg_trigger WHERE tgname LIKE '%notify%'`
- Check RLS policies allow reading

**Duplicate notifications:**
- Verify unique index exists: `\d notifications` in psql
- Check trigger logic for `ON CONFLICT` clause

**Realtime not updating:**
- Check browser console for WebSocket errors
- Verify Supabase project settings allow Realtime
- Check channel subscription in `useNotifications` hook

### Debug Queries

```sql
-- Check all notifications for a user
SELECT * FROM notifications WHERE user_id = '<user-id>' ORDER BY created_at DESC;

-- Check unread notifications
SELECT * FROM notifications WHERE user_id = '<user-id>' AND read_at IS NULL;

-- Check triggers
SELECT * FROM pg_trigger WHERE tgname LIKE '%notify%';

-- Check recent trigger executions (if logging enabled)
SELECT * FROM pg_stat_user_functions WHERE funcname LIKE '%notify%';
```

## What's Next (Future Enhancements)

- Email digests (daily/weekly summaries)
- Push notifications (browser/mobile)
- User preferences (notification settings)
- Admin action notifications
- Notification history retention policy

---

**Last Updated:** October 25, 2025
**Sprint Status:** ✅ Complete
