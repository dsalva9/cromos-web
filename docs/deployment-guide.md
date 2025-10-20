# Deployment Guide - CambioCromos v1.6.0

This guide provides step-by-step instructions for deploying CambioCromos v1.6.0, including database setup, environment configuration, and deployment to production.

## 📋 Prerequisites

### Required Accounts

- [Supabase](https://supabase.com) account
- [Vercel](https://vercel.com) account (for frontend)
- [GitHub](https://github.com) account (for code hosting)

### Required Tools

- Node.js 18+ and npm
- Git
- Supabase CLI (optional but recommended)

---

## 🗄️ Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: CambioCromos v1.6.0
   - **Database Password**: Generate a strong password
   - **Region**: Choose nearest region to your users
5. Click "Create new project"
6. Wait for project to be created (2-3 minutes)

### 2. Configure Database

1. Navigate to **SQL Editor** in your Supabase dashboard
2. Run the following commands to verify database setup:

```sql
-- Check database version
SELECT version();

-- Check table count
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
```

### 3. Run Migration Files

Run all migration files in order using the Supabase SQL Editor:

```sql
-- Phase 0: Cleanup
-- Run migrations/20251010000000_cleanup.sql

-- Sprint 1: Marketplace
-- Run migrations/20251010100000_marketplace.sql

-- Sprint 2: Templates
-- Run migrations/20251010200000_templates.sql

-- Sprint 3: Integration
-- Run migrations/20251010300000_integration.sql

-- Sprint 4: Social
-- Run migrations/20251020120000_create_favourites_system.sql
-- Run migrations/20251020130000_create_user_ratings_system.sql
-- Run migrations/20251020140000_create_template_ratings_system.sql
-- Run migrations/20251020150000_create_reports_system.sql

-- Sprint 5: Admin Moderation
-- Run migrations/20251020160000_extend_audit_log_for_moderation.sql
-- Run migrations/20251020170000_extend_moderation_rpcs_with_audit.sql
-- Run migrations/20251020180000_create_admin_dashboard_rpcs.sql
-- Run migrations/20251020190000_create_moderation_action_rpcs.sql
```

### 4. Set Up Storage Buckets

1. Navigate to **Storage** in your Supabase dashboard
2. Create the following buckets:

```sql
-- Create sticker-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sticker-images', 'sticker-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);
```

3. Set up storage policies:

```sql
-- Policy for public access to sticker-images
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'sticker-images');

-- Policy for public access to avatars
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Policy for authenticated users to upload
CREATE POLICY "Users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  (bucket_id = 'sticker-images' OR bucket_id = 'avatars')
);

-- Policy for users to update their own uploads
CREATE POLICY "Users can update own" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  storage.foldername(name)[1] = auth.uid()::text
);
```

### 5. Configure Authentication

1. Navigate to **Authentication** in your Supabase dashboard
2. Configure the following settings:
   - **Site URL**: Your production URL
   - **Redirect URLs**: Add your production URL
   - **Email Templates**: Customize as needed

---

## 🔧 Environment Configuration

### 1. Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=CambioCromos
NEXT_PUBLIC_APP_VERSION=1.6.0

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
```

### 2. Get Supabase Credentials

1. Navigate to **Project Settings** > **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL**: For `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: For `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: For `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 Frontend Deployment

### 1. Prepare for Deployment

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the application:

   ```bash
   npm run build
   ```

3. Test the build locally:
   ```bash
   npm start
   ```

### 2. Deploy to Vercel

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:

   ```bash
   vercel login
   ```

3. Deploy:

   ```bash
   vercel --prod
   ```

4. Follow the prompts to configure your project

### 3. Configure Custom Domain (Optional)

1. In Vercel dashboard, go to **Project Settings** > **Domains**
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate to be issued

---

## 🔒 Security Configuration

### 1. Database Security

1. Enable Row Level Security (RLS) for all tables
2. Configure proper RLS policies
3. Set up admin roles and permissions
4. Enable database backups

### 2. API Security

1. Use environment variables for all secrets
2. Enable rate limiting
3. Configure CORS properly
4. Set up monitoring and alerts

### 3. Authentication Security

1. Enable two-factor authentication for admin accounts
2. Configure session timeouts
3. Set up password policies
4. Enable email verification

---

## 📊 Monitoring and Logging

### 1. Application Monitoring

1. Set up error tracking (Sentry, etc.)
2. Configure performance monitoring
3. Set up uptime monitoring
4. Create alerts for critical issues

### 2. Database Monitoring

1. Enable query performance insights
2. Set up database monitoring
3. Configure backup notifications
4. Monitor storage usage

### 3. Log Management

1. Configure log aggregation
2. Set up log retention policies
3. Create log-based alerts
4. Regular log analysis

---

## 🔄 Backup and Recovery

### 1. Database Backups

1. Enable automatic daily backups in Supabase
2. Configure point-in-time recovery
3. Set up backup to external storage
4. Test backup restoration process

### 2. Code Backups

1. Use Git for version control
2. Tag releases properly
3. Maintain backup branches
4. Regular code reviews

### 3. Asset Backups

1. Back up user-generated content
2. Configure CDN backup policies
3. Monitor storage usage
4. Implement asset versioning

---

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors

```
Error: "database connection failed"
```

**Solution**: Check database URL and credentials

#### Authentication Errors

```
Error: "invalid API key"
```

**Solution**: Verify API keys in environment variables

#### Build Errors

```
Error: "build failed"
```

**Solution**: Check for missing dependencies or syntax errors

#### Deployment Errors

```
Error: "deployment failed"
```

**Solution**: Check deployment logs for specific error messages

### Debugging Steps

1. Check application logs
2. Verify environment variables
3. Test database connection
4. Check API endpoints
5. Validate data flow

---

## 📈 Performance Optimization

### Database Optimization

1. Add indexes for frequently queried columns
2. Optimize complex queries
3. Implement connection pooling
4. Monitor query performance

### Frontend Optimization

1. Implement code splitting
2. Optimize images and assets
3. Enable caching
4. Minimize bundle size

### CDN Configuration

1. Configure CDN for static assets
2. Enable compression
3. Set up cache headers
4. Monitor CDN performance

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Storage buckets created
- [ ] Security policies configured
- [ ] Backup strategy in place
- [ ] Monitoring configured

### Post-Deployment

- [ ] Verify all features working
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Test admin functions
- [ ] Verify user authentication
- [ ] Check data integrity
- [ ] Test backup restoration

---

## 📞 Support

### Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)

### Troubleshooting Help

- Check application logs
- Review Supabase dashboard
- Consult documentation
- Contact support team

---

**Last Updated**: 2025-10-20
**Version**: v1.6.0-alpha
**Status**: Backend Migration Complete
