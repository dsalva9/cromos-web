# Cromos Web

Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui + Supabase

## Project Overview

A modern web application built with Next.js 15 featuring user authentication, real-time data management, and a responsive UI.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

### Setup

```bash
# Clone and install
git clone <repository-url>
cd cromos-web
npm install

# Environment setup
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

## Development Workflow

### 1. **Plan with Claude**

- Open Claude Code and describe your feature/fix
- Review the implementation plan before proceeding
- Ask for diffs to preview changes

### 2. **Apply & Test**

```bash
# Apply changes (Claude will show diffs first)
npm run dev          # Test locally at localhost:3000
npm run lint         # Check for linting errors
npm run format       # Format code with Prettier
npm run build        # Verify production build
npm run type-check   # Run TypeScript checks
```

### 3. **Commit & Push**

```bash
git add .
git commit -m "feat: add user authentication flow"
git push origin main
```

**Conventional commit types:**

- `feat:` new features
- `fix:` bug fixes
- `refactor:` code restructuring
- `style:` formatting changes
- `docs:` documentation updates
- `test:` adding tests
- `chore:` maintenance tasks

## Environment Variables

Create `.env.local` with these required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Common Gotchas & Fixes

### 1. **Import Path Errors**

```bash
# ❌ Error: Cannot resolve '@/components/ui/button'
# ✅ Fix: Ensure tsconfig.json has path mapping
"paths": { "@/*": ["./src/*"] }
```

### 2. **Tailwind Classes Not Working**

```bash
# ❌ Error: shadcn/ui styles not applied
# ✅ Fix: Check globals.css imports are in correct order
npm run dev  # Restart dev server
```

### 3. **Supabase Connection Issues**

```bash
# ❌ Error: Missing env.NEXT_PUBLIC_SUPABASE_URL
# ✅ Fix: Verify .env.local exists with correct keys
cp .env.example .env.local  # If needed
```

### 4. **Type Errors After Adding Components**

```bash
# ❌ Error: Property 'variant' does not exist
# ✅ Fix: Restart TypeScript service
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### 5. **Build Failures**

```bash
# ❌ Error: Build failed with ESLint errors
# ✅ Fix: Run linting and fix issues
npm run lint
npm run format
npm run build
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run type-check   # Run TypeScript compiler checks
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui + Radix UI
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Icons:** Lucide React
- **Formatting:** Prettier + ESLint
- **Deployment:** Vercel (recommended)

## Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── (auth)/       # Auth-protected routes
│   ├── api/          # API routes
│   ├── globals.css   # Global styles
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── components/       # Reusable components
│   ├── ui/           # shadcn/ui components
│   ├── forms/        # Form components
│   └── layout/       # Layout components
├── lib/              # Utilities & configurations
│   ├── supabase/     # Supabase client & types
│   ├── utils.ts      # Helper functions
│   └── validations/  # Zod schemas
└── types/            # TypeScript type definitions
```

## Database Schema

### Tables

- `profiles` - User profile information
- `[add other tables as you create them]`

### Auth

- Email/password authentication via Supabase Auth
- Row Level Security (RLS) enabled

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Manual Deployment

```bash
npm run build
npm run start
```

## Contributing

1. Plan changes with Claude Code first
2. Follow conventional commit format
3. Ensure all tests pass before committing
4. Keep commits atomic and focused

## Troubleshooting

### Common Issues

- **Port 3000 in use:** Kill process or use different port
- **Module resolution errors:** Clear `.next` folder and restart
- **Supabase connection:** Verify environment variables
- **Type errors:** Restart TypeScript server in VS Code

### Getting Help

1. Check this README first
2. Review error logs carefully
3. Consult Next.js/Supabase documentation
4. Ask Claude Code for specific implementation guidance
