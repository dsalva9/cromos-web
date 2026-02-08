---
description: How to use the local Supabase development environment
---

# Local Supabase Development Workflow

## Quick Start

// turbo-all

```bash
# Start local Supabase (ensure Docker Desktop is running)
npx -y supabase@latest start

# Stop local Supabase
npx -y supabase@latest stop
```

## Local Service URLs

| Service          | URL                                   |
|------------------|---------------------------------------|
| **API Endpoint** | http://127.0.0.1:54321                |
| **Studio**       | http://127.0.0.1:54323                |
| **Mailpit**      | http://127.0.0.1:54324                |
| **Database**     | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## Database Changes

1. **Create a new migration:**
   ```bash
   npx -y supabase@latest migration new feature_name
   ```

2. **Edit the migration file** in `supabase/migrations/`

3. **Test locally:**
   ```bash
   npx -y supabase@latest db reset
   ```

4. **Push to production:**
   ```bash
   npx -y supabase@latest db push --dry-run  # Preview
   npx -y supabase@latest db push            # Apply
   ```

## Edge Functions

**Test locally:**
```bash
npx -y supabase@latest functions serve
```

**Deploy to production:**
```bash
npx -y supabase@latest functions deploy <function-name>
```

## Deployment Order

When deploying changes, always follow this order:

1. **Database first:** `npx supabase db push`
2. **Edge Functions:** `npx supabase functions deploy <name>`
3. **Frontend:** `git push` (Vercel auto-deploys)

## Important Notes

### Storage is Disabled Locally

Storage is disabled in `supabase/config.toml` to avoid CLI version mismatch issues (CLI bundles storage-api v1.33.0 while production uses v1.37.0).

**Implications:**
- File upload features will not work locally
- For storage testing, connect to production Supabase
- Storage policies/triggers are commented out in the migration file

### Environment Files

- **`.env.local`** - Local development (points to 127.0.0.1:54321)
- To test against production, update `.env.local` to use production URL

### Switching Between Local and Production

**Local development:**
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-publishable-key>
```

**Production testing:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://cuzuzitadwmrlocqhhtu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
```

## Troubleshooting

### Port Already in Use
```bash
# Stop all Supabase projects
npx supabase stop --all
```

### Migration Errors
```bash
# Reset local database and reapply all migrations
npx supabase db reset
```

### Check Service Status
```bash
npx supabase status
```
