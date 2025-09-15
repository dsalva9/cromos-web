# Cromos Web

Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui + Supabase

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

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui + Radix UI
- **Database:** Supabase
- **Icons:** Lucide React
- **Formatting:** Prettier + ESLint

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # Reusable components
│   └── ui/        # shadcn/ui components
└── lib/           # Utilities & configurations
```