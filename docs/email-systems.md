# Email Systems - CambioCromos

**Version**: v1.6.0
**Last Updated**: 2026-02-03

This document describes all email systems in CambioCromos, including outbound notifications and inbound email forwarding.

---

## Overview

CambioCromos uses [Resend](https://resend.com) for all email operations, integrated through Supabase Edge Functions. The platform supports:

1. **Outbound Emails**: Automated notifications triggered by platform events
2. **Inbound Email Forwarding**: Automatic forwarding of emails sent to @cambiocromos.com addresses

---

## Outbound Email System

### Architecture

**Trigger Flow**:
```
Database Trigger
    ↓
send_email_notification Edge Function
    ↓
Resend API
    ↓
User's Email
```

### Edge Function: `send-email-notification`

**Location**: `supabase/functions/send-email-notification/index.ts`

**Purpose**: Sends transactional emails for platform notifications

**Environment Variables**:
- `RESEND_API_KEY` - API key for Resend
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

**Triggered By**: Database triggers on the `notifications` table

**Email Types**:
- New chat messages
- Listing reservations
- Transaction completions
- Badge awards
- System announcements

**Template**: Uses inline HTML templates with CambioCromos branding

**Rate Limiting**: Sequential sending with delays to respect Resend's rate limits

**Error Handling**:
- Logs all errors to console
- Updates notification status in database
- Does not retry failed sends

### Database Integration

**Notifications Table**:
```sql
notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

**Trigger**:
- Fires on INSERT to `notifications` table
- Only triggers for users with email notifications enabled
- Calls `send-email-notification` Edge Function asynchronously

### User Preferences

Users can control email notifications via the Settings page (`/ajustes`):

```sql
notification_preferences JSONB {
  "in_app": {
    "new_message": true,
    "listing_reserved": true,
    ...
  },
  "email": {
    "new_message": true,
    "listing_reserved": true,
    ...
  }
}
```

---

## Inbound Email Forwarding System

### Architecture

**Flow**:
```
Email to @cambiocromos.com
    ↓
Resend Inbound Processing
    ↓
Webhook to receive-inbound-email Edge Function
    ↓
Fetch Active Forwarding Addresses
    ↓
Forward to Each Address (with rate limiting)
    ↓
Log Results to Database
```

### Edge Function: `receive-inbound-email`

**Location**: `supabase/functions/receive-inbound-email/index.ts`

**Purpose**: Receives inbound emails via webhook and forwards them to configured admin addresses

**Environment Variables**:
- `RESEND_API_KEY` - API key for forwarding emails
- `RESEND_WEBHOOK_SECRET` - Webhook signing secret for signature verification
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

**Security**:
- Verifies webhook signature using `svix`
- Always returns 200 to prevent retries
- Catches all errors silently

**Rate Limiting**:
- Sends emails sequentially with 600ms delay between sends
- Respects Resend's limit of 2 requests per second
- Prevents `rate_limit_exceeded` errors

**Email Formatting**:
- Subject: `[Forwarded] {original subject}`
- From: `CambioCromos <info@cambiocromos.com>`
- Body: HTML template showing original email details + content
- Includes: Original from, to, date, subject, and body (HTML or plain text)

### Database Schema

#### `email_forwarding_addresses`
Stores email addresses that will receive forwarded emails.

```sql
CREATE TABLE email_forwarding_addresses (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);
```

**Indexes**:
- `idx_email_forwarding_active` - Filtered index on `is_active = true` for fast lookups

**RLS**: All access denied by default (admin-only via RPC)

#### `inbound_email_log`
Audit trail of all received and forwarded emails.

```sql
CREATE TABLE inbound_email_log (
    id SERIAL PRIMARY KEY,
    resend_email_id TEXT,
    from_address TEXT NOT NULL,
    to_addresses TEXT[] NOT NULL,
    subject TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    forwarded_to TEXT[],
    forwarding_status TEXT NOT NULL CHECK (forwarding_status IN ('success', 'partial_failure', 'failed')),
    error_details JSONB
);
```

**Indexes**:
- `idx_inbound_email_log_received_at` - Descending index for recent logs

**RLS**: All access denied by default (admin-only via RPC)

### RPC Functions

All functions require admin privileges (`is_admin = true`).

#### `admin_list_forwarding_addresses()`
Returns all forwarding addresses with metadata.

**Returns**:
```typescript
{
  id: number;
  email: string;
  is_active: boolean;
  added_by: string | null;
  added_by_username: string | null;
  added_at: string;
  last_used_at: string | null;
}[]
```

#### `admin_add_forwarding_address(p_email TEXT)`
Adds a new forwarding address with validation.

**Parameters**:
- `p_email` - Email address to add

**Validation**:
- Email format validation (regex)
- Unique constraint (no duplicates)
- Admin-only access

**Returns**: ID of new address

#### `admin_remove_forwarding_address(p_id INTEGER)`
Removes a forwarding address.

**Parameters**:
- `p_id` - ID of address to remove

**Returns**: Boolean (success)

#### `admin_toggle_forwarding_address(p_id INTEGER, p_is_active BOOLEAN)`
Enables or disables a forwarding address.

**Parameters**:
- `p_id` - ID of address
- `p_is_active` - New active status

**Returns**: Boolean (success)

#### `admin_get_inbound_email_logs(p_limit INTEGER, p_offset INTEGER)`
Retrieves inbound email logs with pagination.

**Parameters**:
- `p_limit` - Number of logs to return (default: 25)
- `p_offset` - Pagination offset (default: 0)

**Returns**: Array of log entries with all fields

### Admin UI

**Location**: `/admin/settings`

**Components**:
- `EmailForwardingSettings` - Manage forwarding addresses
- `InboundEmailLogs` - View forwarding history
- `AddForwardingAddressDialog` - Add new addresses

**Features**:
- Add/remove forwarding addresses
- Toggle addresses active/inactive
- View forwarding history with status
- Expandable error details for failed forwards
- Last used timestamp tracking
- Pagination for logs (25 per page)

**Hooks**:
- `useEmailForwarding` - Custom hook for address management

---

## Configuration

### Resend Setup

#### 1. Domain Verification

**In Resend Dashboard**:
1. Add domain: `cambiocromos.com`
2. Add DNS records provided by Resend:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)

**In DNS Provider (name.com)**:
- Add all required DNS records
- Wait for verification (usually a few minutes)

#### 2. Outbound Configuration

**Already Configured**:
- Sending domain verified
- API key generated and stored in Supabase secrets
- Edge Function deployed

#### 3. Inbound Configuration

**In Resend Dashboard**:
1. Go to Domains > cambiocromos.com > Inbound
2. Configure inbound routing for `*@cambiocromos.com`
3. Add MX records to DNS:
   ```
   MX 10 mx1.inbound.resend.com
   MX 10 mx2.inbound.resend.com
   ```

**In DNS Provider (name.com)**:
- Add MX records provided by Resend
- Priority: 10 for both records

#### 4. Webhook Configuration

**In Resend Dashboard**:
1. Go to Webhooks
2. Create new webhook
3. URL: `https://cuzuzitadwmrlocqhhtu.supabase.co/functions/v1/receive-inbound-email`
4. Events: Select "email.received" or "inbound"
5. Copy webhook signing secret

**In Supabase**:
```bash
npx supabase secrets set RESEND_WEBHOOK_SECRET="whsec_..." --project-ref cuzuzitadwmrlocqhhtu
```

---

## Monitoring & Debugging

### Outbound Emails

**Check Logs**:
```bash
npx supabase functions logs send-email-notification
```

**Database Query**:
```sql
SELECT * FROM notifications
WHERE email_sent = false
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

**Common Issues**:
- User has email notifications disabled
- Invalid email address in profile
- Resend API rate limit exceeded
- SMTP errors (bounce, spam)

### Inbound Email Forwarding

**Check Edge Function Logs**:
```bash
npx supabase functions logs receive-inbound-email
```

**Check Forwarding Logs**:
```sql
SELECT * FROM inbound_email_log
ORDER BY received_at DESC
LIMIT 50;
```

**Check Active Addresses**:
```sql
SELECT * FROM email_forwarding_addresses
WHERE is_active = true;
```

**Common Issues**:
- No active forwarding addresses configured
- Rate limit exceeded (429 errors)
- Webhook signature verification failed
- Invalid email format in forwarding addresses
- Resend inbound routing not configured

---

## Rate Limits

### Resend Limits

**Free Tier**:
- 100 emails per day
- 2 requests per second

**Paid Tier**:
- Higher daily limits (depends on plan)
- 2 requests per second (same)

### Implementation

Both Edge Functions implement rate limiting:
- Sequential sending with delays
- 600ms delay between sends
- Stays under 2 req/sec limit

---

## Security

### Authentication
- All RPC functions require admin role
- Edge Functions use SERVICE_ROLE for database access
- Webhook signatures verified with `svix`

### Data Protection
- Email addresses validated with regex
- No sensitive user data in logs
- RLS policies prevent direct table access
- Admin UI protected by `AdminGuard`

### Best Practices
- Regular audit of forwarding addresses
- Monitor failed forwards for issues
- Review logs for suspicious activity
- Keep webhook secret secure
- Rotate API keys periodically

---

## Future Enhancements

### Planned Features
- [ ] Per-address forwarding rules (subject filters)
- [ ] Attachment forwarding support
- [ ] Email metrics dashboard
- [ ] Auto-cleanup of old logs (data retention)
- [ ] Email templates for different scenarios
- [ ] Bounce and spam handling
- [ ] Multi-language support for templates
- [ ] Reply-to handling for forwarded emails

### Performance Improvements
- [ ] Batch email sending
- [ ] Background job queue for emails
- [ ] Caching for frequent queries
- [ ] CDN for email templates

---

## Troubleshooting

### "Email not received"

1. Check user notification preferences
2. Verify email in user profile
3. Check Edge Function logs for errors
4. Check Resend dashboard for delivery status
5. Check spam folder

### "Forwarding failed"

1. Verify forwarding address is active
2. Check inbound email logs for errors
3. Verify webhook is configured correctly
4. Check MX records in DNS
5. Review Edge Function logs

### "Rate limit exceeded"

1. Check number of forwarding addresses
2. Reduce frequency of test emails
3. Verify rate limiting delays are working
4. Consider upgrading Resend plan

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture
- [api-endpoints.md](./api-endpoints.md) - RPC function documentation
- [database-schema.md](./database-schema.md) - Database structure

---

**Maintained by**: Development Team
**Contact**: For issues, contact the admin team through the admin console
