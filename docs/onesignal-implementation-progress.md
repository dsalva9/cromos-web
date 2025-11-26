# OneSignal Integration - Implementation Progress

## ✅ Phase 1: Database Schema (COMPLETED)

### Files Created:
- `supabase/migrations/20251126153000_add_onesignal_support.sql`

### Changes:
- ✅ Added `onesignal_player_id` column to `profiles` table
- ✅ Added `notification_preferences` JSONB column with defaults
- ✅ Created RPC function `update_onesignal_player_id(player_id TEXT)`
- ✅ Created RPC function `get_notification_preferences()`
- ✅ Created RPC function `update_notification_preferences(preferences JSONB)`
- ✅ Created helper RPC `get_user_notification_settings(user_id UUID)` for Edge Functions
- ✅ Backfilled existing users with default preferences
- ✅ **Migration Applied** to Supabase project `cromos-web`

---

## ✅ Phase 2: Frontend OneSignal Integration (COMPLETED)

### Files Created:
- `src/lib/onesignal/config.ts` - OneSignal configuration
- `src/lib/onesignal/deep-linking.ts` - Deep link handler
- `src/lib/supabase/notification-preferences.ts` - Client library for preferences
- `public/OneSignalSDKWorker.js` - Service worker for web push
- `public/OneSignalSDKUpdaterWorker.js` - Service worker updater

### Files Modified:
- `src/components/providers/OneSignalProvider.tsx` - Complete rewrite to support web + mobile
- `.env.local` - Added OneSignal environment variables

### Changes:
- ✅ OneSignal initializes on both web browsers and mobile (Capacitor)
- ✅ Player IDs are automatically stored in database when users subscribe
- ✅ Deep linking configured to route users from push notifications to correct screens
- ✅ Notification click handlers implemented
- ✅ User login/external ID set in OneSignal for targeted notifications

---

## ✅ Phase 3: Backend Push Integration (COMPLETED)

### Files Created:
- `supabase/functions/send-push-notification/index.ts` - Edge Function for sending push notifications

### Changes:
- ✅ Edge Function fetches user settings (player ID, preferences)
- ✅ Respects user's `push_enabled` preference
- ✅ Calls OneSignal REST API to send push notifications
- ✅ Includes deep link data in notification payload
- ✅ Error handling and logging

### Next Steps for Phase 3:
1. **Deploy the Edge Function**:
   ```bash
   # Via Supabase CLI
   supabase functions deploy send-push-notification
   
   # Or via Supabase Dashboard: Edge Functions → Deploy
   ```

2. **Set Supabase Secret** for OneSignal API Key:
   ```bash
   # Via Supabase Dashboard: Settings → Edge Functions → Secrets
   # Add: ONESIGNAL_REST_API_KEY = os_v2_app_hoplozhuibae3fe2crudk2x4ddrz6riwk3zu2wntv7i4bmejykabzmip7dxordufvda6fcfixgwmk4pz2kpc2r4kpbpyqxv3fpaiehi
   ```

---

## ✅ Phase 4: User Preferences UI (COMPLETED)

### Files Created:
- `src/app/(authenticated)/ajustes/page.tsx` - Settings page for notification preferences

### Files Modified:
- `src/components/profile/UserAvatarDropdown.tsx` - Added "Ajustes" link
- `src/components/navigation/MobileBottomNav.tsx` - Added "Ajustes" link

### Changes:
- ✅ Simple toggle UI for Push and Email notifications
- ✅ In-app notifications always enabled (displayed but not toggleable)
- ✅ Real-time preference updates
- ✅ Navigation menus updated to link to `/ajustes`

---

## ✅ Phase 5: Database Triggers (COMPLETED)

### Files Created:
- `supabase/migrations/20251126180000_add_push_triggers.sql`

### Changes:
- ✅ Enabled `pg_net` extension
- ✅ Created `send_push_notification_trigger` function
- ✅ Created trigger on `notifications` table (AFTER INSERT)
- ✅ Dynamic title/body generation based on notification kind
- ✅ **Migration Applied** to Supabase project `cromos-web`

---

## ⏳ Phase 6: Email Notifications (OPTIONAL - PENDING)

### What's Needed:
1. **Configure Email Provider in OneSignal Dashboard**:
   - Go to [OneSignal Dashboard](https://app.onesignal.com)
   - Navigate to: Your App → Settings → Email
   - Choose provider (Recommended: Mailgun)
   - Configure credentials
   - Verify sender domain

2. **Create Email Edge Function**:
   - `supabase/functions/send-email-notification/index.ts`
   - Similar to push function, but calls OneSignal Email API

3. **Create Email Templates**:
   - HTML templates for different notification types
   - Stored in `supabase/functions/send-email-notification/templates/`

---

## 📋 Testing Checklist

### Web Push Notifications:
- [ ] Open app in Chrome/Firefox
- [ ] OneSignal prompt appears
- [ ] Accept push notification permission
- [ ] Player ID saved to database (check `profiles.onesignal_player_id`)
- [ ] Trigger a notification (e.g., send a chat message)
- [ ] Push notification received
- [ ] Click notification → deep link works

### Mobile Push Notifications:
- [ ] Build Android APK with updated code
- [ ] Install on device
- [ ] Accept push notification permission
- [ ] Player ID saved to database
- [ ] Trigger a notification
- [ ] Push notification received on device
- [ ] Click notification → app opens to correct screen

### Notification Preferences:
- [ ] Navigate to `/ajustes`
- [ ] Toggle push notifications off
- [ ] Trigger a notification → no push received
- [ ] In-app notification still appears
- [ ] Toggle push back on
- [ ] Trigger a notification → push received

---

## 🚀 Deployment Steps (Remaining)

### 1. Set Supabase Secrets:
```bash
# Via Dashboard: Settings → Edge Functions → Secrets
ONESIGNAL_REST_API_KEY=os_v2_app_hoplozhuibae3fe2crudk2x4ddrz6riwk3zu2wntv7i4bmejykabzmip7dxordufvda6fcfixgwmk4pz2kpc2r4kpbpyqxv3fpaiehi
```

### 2. Deploy Edge Function:
```bash
supabase functions deploy send-push-notification
```

### 3. Deploy to Vercel:
```bash
git add .
git commit -m "feat: OneSignal push notifications integration"
git push origin main
```
