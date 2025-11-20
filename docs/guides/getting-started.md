# Getting Started with CambioCromos

Quick start guide for setting up and running the CambioCromos marketplace platform locally.

---

## Prerequisites

- **Node.js** 18+ or 20+ 
- **npm** or **yarn**
- **Git**
- **Supabase account** (for database access)

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cromos-web.git
cd cromos-web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
copy .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy Project URL and anon/public key

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Credentials

For testing, you can use:
- **Email**: `dsalva9@hotmail.com`
- **Password**: `test12345`

---

## Project Structure

```
cromos-web/
├── src/
│   ├── app/                 # Next.js pages (App Router)
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and helpers
│   └── types/               # TypeScript types
├── docs/                    # Documentation
├── public/                  # Static assets
└── tests/                   # Playwright E2E tests
```

---

## Key Technologies

- **Framework**: Next.js 15.5 (App Router)
- **Language**: TypeScript 5.7
- **UI**: React 19 + Tailwind CSS 4.0
- **Backend**: Supabase (PostgreSQL)
- **Testing**: Playwright

---

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test:e2e     # Run Playwright tests
```

---

## Next Steps

1. **Explore the app** at http://localhost:3000
2. **Read the architecture** → [Architecture Guide](../architecture/ARCHITECTURE.md)
3. **Check current features** → [Current Features](../features/current-features.md)
4. **Learn the components** → [Components Guide](../components/components-guide.md)
5. **Make your first contribution** → [Contributing Guide](../contributing/CONTRIBUTING.md)

---

## Common Issues

**Port 3000 already in use:**
```bash
# Kill the process using port 3000
taskkill /F /IM node.exe
```

**Supabase connection errors:**
- Verify your `.env.local` credentials
- Check Supabase project is running
- Ensure you're using the correct project URL

**Build errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

---

## Getting Help

- **Documentation Index**: [/docs/guides/README.md](./README.md)
- **Project Instructions**: [/PROJECT-INSTRUCTIONS.md](../../PROJECT-INSTRUCTIONS.md)
- **TODO List**: [/TODO.md](../../TODO.md)

---

Last Updated: 2025-11-20
