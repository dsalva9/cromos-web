# Dark/Light Mode Toggle - Complete Implementation Plan

## Project Context

**Application:** CambioCromos - A Next.js 14 trading card (cromos) marketplace and collection management platform
**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, Radix UI primitives
**Current State:** Application recently transitioned from dark-mode-first to light-mode-first design
**Goal:** Implement a user-controlled dark/light/system theme toggle while maintaining admin console in dark mode

## Current Architecture State

### CSS Variables (src/app/globals.css)
- ✅ Both light and dark CSS variables are ALREADY defined
- ✅ Default (root) variables are set to light mode
- ✅ `.dark` class contains all dark mode variables
- ✅ Uses OKLCH color space for better color management

### Tailwind Configuration (tailwind.config.ts)
- ✅ Dark mode configured: `darkMode: ['class']`
- ✅ Uses class-based dark mode (not media query)
- ✅ Custom colors reference CSS variables

### Current Implementation Details
- Light mode is the default across all non-admin pages
- Admin layout (`src/app/admin/layout.tsx`) manually applies `dark` class to preserve dark mode
- 68+ component files were recently updated with explicit light mode colors
- Components use hardcoded light colors: `bg-white`, `text-gray-900`, `border-gray-200`, etc.
- These need dark variants added: `dark:bg-gray-800`, `dark:text-white`, `dark:border-gray-700`

### Brand Colors
- Primary brand color: `#FFC000` (yellow) - used for CTAs, highlights
- This color works well in both light and dark modes
- May need slight adjustments for dark mode contrast/accessibility

## Implementation Plan

### PHASE 1: Theme Infrastructure (Estimated: 2-3 hours)

#### Task 1.1: Create Theme Provider
**File:** `src/components/providers/ThemeProvider.tsx` (NEW FILE)

**Implementation:**
```tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark'; // What's actually applied
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load theme from localStorage on mount
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      setThemeState(stored);
    } else {
      // Default to system preference
      setThemeState('system');
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Determine resolved theme
    let resolved: 'light' | 'dark' = 'light';

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = systemPrefersDark ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);

    // Apply/remove dark class
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

**Key Features:**
- Supports 'light', 'dark', and 'system' modes
- Persists preference to localStorage
- Listens to system preference changes
- Applies/removes 'dark' class on `<html>` element
- Provides `resolvedTheme` to show what's actually applied

#### Task 1.2: Integrate Theme Provider into App
**File:** `src/app/layout.tsx`

**Changes:**
```tsx
// Add import at top
import { ThemeProvider } from '@/components/providers/ThemeProvider';

// Wrap app in ThemeProvider (inside SupabaseProvider, before ErrorBoundary)
<SupabaseProvider>
  <ThemeProvider>
    <OneSignalProvider>
      {/* rest of providers */}
    </OneSignalProvider>
  </ThemeProvider>
</SupabaseProvider>
```

**Location:** After line 57, wrap existing providers

#### Task 1.3: Prevent Flash of Wrong Theme
**File:** `src/app/layout.tsx`

**Add script to `<head>` to prevent FOUC (Flash of Unstyled Content):**
```tsx
// Add inside <html> tag, before <body>
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        const theme = localStorage.getItem('theme') || 'system';
        const root = document.documentElement;

        if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          root.classList.add('dark');
        }
      })();
    `,
  }}
/>
```

**Purpose:** Apply dark class immediately before React hydrates to prevent flash

### PHASE 2: Settings UI (Estimated: 1 hour)

#### Task 2.1: Create Theme Settings Component
**File:** `src/components/settings/ThemeSettingsSection.tsx` (NEW FILE)

**Implementation:**
```tsx
'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeSettingsSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Oscuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
  ];

  return (
    <ModernCard>
      <ModernCardContent className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Tema de la aplicación
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Selecciona el tema que prefieres para la interfaz
          {theme === 'system' && ` (Actualmente: ${resolvedTheme === 'dark' ? 'oscuro' : 'claro'})`}
        </p>

        <div className="grid grid-cols-3 gap-3">
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                theme === value
                  ? 'border-[#FFC000] bg-[#FFC000]/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <Icon className={cn(
                'h-6 w-6',
                theme === value ? 'text-[#FFC000]' : 'text-gray-600 dark:text-gray-400'
              )} />
              <span className={cn(
                'text-sm font-medium',
                theme === value ? 'text-[#FFC000]' : 'text-gray-900 dark:text-white'
              )}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
```

#### Task 2.2: Add Theme Section to Settings Page
**File:** `src/components/settings/SystemSettingsTab.tsx`

**Changes:**
```tsx
// Add import at top
import { ThemeSettingsSection } from './ThemeSettingsSection';

// Add as first item in the return statement (before "Sign Out All Devices")
return (
  <div className="space-y-4 md:space-y-6">
    <ThemeSettingsSection />

    {/* Sign Out All Devices */}
    {/* ... rest of existing content */}
  </div>
);
```

### PHASE 3: Admin Override Logic (Estimated: 30 minutes)

#### Task 3.1: Update Admin Layout
**File:** `src/app/admin/layout.tsx`

**Changes:**
```tsx
'use client';

import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force dark mode for admin, override user preference
    const root = document.documentElement;
    root.classList.add('dark');

    // Cleanup: restore user preference when leaving admin
    return () => {
      // Re-apply user's theme preference
      const userTheme = localStorage.getItem('theme') || 'light';
      if (userTheme === 'light') {
        root.classList.remove('dark');
      } else if (userTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (!systemPrefersDark) {
          root.classList.remove('dark');
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1F2937]">
      {children}
    </div>
  );
}
```

**Note:** Ensure admin always stays dark regardless of user preference

### PHASE 4: Component Dark Mode Updates (Estimated: 10-15 hours)

This is the largest phase. Each component needs dark mode variants added to className strings.

#### Pattern to Follow:
```tsx
// BEFORE (current light-mode only)
<div className="bg-white text-gray-900 border-gray-200">

// AFTER (with dark mode support)
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700">
```

#### Common Color Mappings:

| Light Mode | Dark Mode | Use Case |
|------------|-----------|----------|
| `bg-white` | `dark:bg-gray-800` | Cards, modals, surfaces |
| `bg-gray-50` | `dark:bg-gray-900` | Page backgrounds |
| `bg-gray-100` | `dark:bg-gray-800` | Secondary backgrounds |
| `bg-gray-200` | `dark:bg-gray-700` | Tertiary backgrounds |
| `text-gray-900` | `dark:text-white` | Primary text |
| `text-gray-600` | `dark:text-gray-400` | Secondary text |
| `text-gray-500` | `dark:text-gray-500` | Tertiary text (same) |
| `border-gray-200` | `dark:border-gray-700` | Borders |
| `border-gray-300` | `dark:border-gray-600` | Input borders |
| `shadow-md` | `dark:shadow-none` | Shadows (often removed) |
| `shadow-lg` | `dark:shadow-2xl` | Strong shadows |
| `ring-gray-300` | `dark:ring-gray-600` | Focus rings |

**Brand color `#FFC000` (yellow):**
- Generally stays the same in both modes
- High contrast in both light and dark
- May need `dark:bg-[#FFD700]` for hover states if contrast is insufficient

#### Task 4.1: Update UI Primitives
**Critical:** These are used everywhere, so updating them cascades benefits

**Files to update (17 files):**
1. `src/components/ui/dialog.tsx`
2. `src/components/ui/alert-dialog.tsx`
3. `src/components/ui/input.tsx`
4. `src/components/ui/textarea.tsx`
5. `src/components/ui/select.tsx`
6. `src/components/ui/dropdown-menu.tsx`
7. `src/components/ui/button.tsx`
8. `src/components/ui/modern-card.tsx`
9. `src/components/ui/badge.tsx`
10. `src/components/ui/alert.tsx`
11. `src/components/ui/checkbox.tsx`
12. `src/components/ui/tabs.tsx`
13. `src/components/ui/label.tsx`
14. `src/components/ui/QuantityStepper.tsx`
15. `src/components/ui/user-link.tsx`
16. `src/components/ui/empty-state.tsx`
17. `src/components/ui/SegmentedTabs.tsx`

**Example for dialog.tsx:**
```tsx
// Line ~50 - DialogContent
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 p-6 shadow-2xl duration-200",
  className
)}

// Line ~60 - Close button
className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white dark:ring-offset-gray-800 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-offset-2 disabled:pointer-events-none"

// Line ~70 - DialogTitle
className={cn(
  "text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-white",
  className
)}

// Line ~80 - DialogDescription
className={cn("text-sm text-gray-600 dark:text-gray-400", className)}
```

**Apply similar pattern to all 17 UI primitive files.**

#### Task 4.2: Update Layout Components
**Files to update (4 files):**
1. `src/components/site-header.tsx`
2. `src/components/navigation/MobileBottomNav.tsx`
3. `src/components/navigation/FloatingActionBtn.tsx`
4. `src/components/layout/SiteFooter.tsx`

**Example for site-header.tsx:**
```tsx
// Line ~60 - Header container
<header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm">

// Line ~80 - Nav links
className="text-gray-900 dark:text-gray-100 hover:text-[#FFC000] dark:hover:text-[#FFC000]"

// Line ~100 - Mobile menu button
className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
```

#### Task 4.3: Update Page Components
**Files to update (25+ files):**

**Marketplace Pages:**
1. `src/app/marketplace/page.tsx`
2. `src/app/marketplace/create/page.tsx`
3. `src/app/marketplace/my-listings/page.tsx`
4. `src/app/marketplace/favorites/page.tsx`
5. `src/app/marketplace/[id]/page.tsx`
6. `src/app/marketplace/[id]/edit/page.tsx`
7. `src/app/marketplace/[id]/chat/page.tsx`
8. `src/app/marketplace/reservations/page.tsx`

**Profile Pages:**
9. `src/app/users/[userId]/page.tsx`
10. `src/app/(authenticated)/profile/page.tsx`
11. `src/app/(authenticated)/profile/reset-password/page.tsx`
12. `src/app/(authenticated)/profile/ignored/page.tsx`
13. `src/app/(authenticated)/completar-perfil/page.tsx`

**Template Pages:**
14. `src/app/mis-plantillas/page.tsx`
15. `src/app/mis-plantillas/[copyId]/page.tsx`
16. `src/app/albumenes/page.tsx`
17. `src/app/albumenes/[albumId]/page.tsx`

**Settings Pages:**
18. `src/app/(authenticated)/ajustes/page.tsx`
19. `src/components/settings/NotificationSettingsTab.tsx`
20. `src/components/settings/IgnoredUsersTab.tsx`
21. `src/components/settings/SystemSettingsTab.tsx` (already updated with light mode)

**Other Pages:**
22. `src/app/page.tsx` (home)
23. `src/app/chats/page.tsx`
24. `src/app/login/page.tsx`
25. `src/app/signup/page.tsx`
26. `src/app/forgot-password/page.tsx`

**Pattern for pages:**
```tsx
// Page container
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">

// Page heading
<h1 className="text-3xl font-black text-gray-900 dark:text-white">

// Page description
<p className="text-gray-600 dark:text-gray-400">

// Content cards
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
```

#### Task 4.4: Update Marketplace Components
**Files to update (10 files):**
1. `src/components/marketplace/ListingCard.tsx`
2. `src/components/marketplace/ListingFavoriteButton.tsx`
3. `src/components/integration/MyListingCard.tsx`
4. `src/components/marketplace/CreateListingModal.tsx`
5. `src/components/marketplace/EditListingModal.tsx`
6. `src/components/marketplace/ReserveListingModal.tsx`
7. `src/components/marketplace/CompleteListingModal.tsx`
8. `src/components/marketplace/CancelReservationModal.tsx`
9. `src/components/marketplace/ListingFilters.tsx`
10. `src/components/marketplace/SearchBar.tsx`

**Example for ListingCard.tsx:**
```tsx
// Line ~86 - Card container
<div className="group relative h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md dark:hover:shadow-xl transition-all duration-300">

// Line ~129 - Title
<h3 className="font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 text-sm group-hover:text-primary transition-colors">

// Line ~134 - Collection name
<p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">

// Line ~140 - Border
<div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
```

#### Task 4.5: Update Template Components
**Files to update (8 files):**
1. `src/components/templates/TemplateProgressGrid.tsx`
2. `src/components/templates/SlotTile.tsx`
3. `src/components/templates/TemplateSummaryHeader.tsx`
4. `src/components/templates/QuickEntryModal.tsx`
5. `src/components/templates/ManualSlotModal.tsx`
6. `src/components/templates/BulkEntryModal.tsx`
7. `src/components/templates/TemplateStatsCard.tsx`
8. `src/components/templates/AlbumCard.tsx`

#### Task 4.6: Update Profile Components
**Files to update (6 files):**
1. `src/components/profile/ProfileHeader.tsx`
2. `src/components/profile/ProfileStats.tsx`
3. `src/components/profile/ProfileBadges.tsx`
4. `src/components/profile/ProfileBadgesSimple.tsx`
5. `src/components/profile/UserAvatarDropdown.tsx`
6. `src/components/profile/ProfileCompletionGuard.tsx`

#### Task 4.7: Update Modal Components
**Files to update (remaining modals - ~10 files):**
1. `src/components/legal/TermsModal.tsx`
2. `src/components/legal/PrivacyModal.tsx`
3. `src/components/social/ShareModal.tsx`
4. `src/components/social/ReportModal.tsx`
5. Plus any other modal components found in the codebase

#### Task 4.8: Update Skeleton/Loading Components
**Files to update (5 files):**
1. `src/components/skeletons/ListingCardSkeleton.tsx`
2. `src/components/skeletons/ProfileSkeleton.tsx`
3. `src/components/skeletons/TemplateSkeleton.tsx`
4. `src/app/loading.tsx`
5. Any other skeleton components

**Pattern for skeletons:**
```tsx
// Change from:
<div className="animate-pulse bg-gray-200 rounded">

// To:
<div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded">
```

#### Task 4.9: Update Home Page Components
**Files to update (4 files):**
1. `src/components/home/Hero.tsx`
2. `src/components/home/FeatureHighlights.tsx`
3. `src/components/home/HowItWorks.tsx`
4. `src/components/home/MarketplaceShowcase.tsx`

### PHASE 5: Special Cases & Edge Cases (Estimated: 2 hours)

#### Task 5.1: Handle Images and Media
Some images may need variants:
- Logo: May need light/dark versions
- Icons: Ensure they have proper contrast in both modes

**Example pattern:**
```tsx
<Image
  src={resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
  alt="Logo"
/>
```

Or use CSS filter for simple color inversion:
```tsx
<Image
  className="dark:invert"
  src="/logo.svg"
  alt="Logo"
/>
```

#### Task 5.2: Update Badge Colors
**File:** `src/components/ui/badge.tsx` and status badges throughout

Status badges may need different color schemes for dark mode:
```tsx
// Example for "active" status
className={cn(
  status === 'active' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  status === 'sold' && 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
)}
```

#### Task 5.3: Update Charts/Visualizations (if any)
If the app has any charts or data visualizations, update their color schemes:
- Use dark mode-aware colors
- Ensure proper contrast
- Test readability

#### Task 5.4: Form Validation States
Ensure error/success states work in dark mode:
```tsx
// Error state
className="border-red-500 dark:border-red-400 text-red-600 dark:text-red-400"

// Success state
className="border-green-500 dark:border-green-400 text-green-600 dark:text-green-400"
```

#### Task 5.5: Focus States and Accessibility
Update focus rings for dark mode:
```tsx
className="focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
```

### PHASE 6: Testing & Quality Assurance (Estimated: 3-4 hours)

#### Task 6.1: Visual Testing Checklist

Test each page in both themes:
- [ ] Home page
- [ ] Marketplace listing grid
- [ ] Marketplace detail page
- [ ] Marketplace chat
- [ ] My listings page
- [ ] Create listing
- [ ] Profile page
- [ ] Templates page
- [ ] Template detail page
- [ ] Settings page (all tabs)
- [ ] Login/Signup
- [ ] All modals (create, edit, reserve, etc.)
- [ ] Admin console (verify always dark)

#### Task 6.2: Functionality Testing

For each theme mode:
- [ ] Light mode: All interactions work
- [ ] Dark mode: All interactions work
- [ ] System mode: Switches correctly based on OS preference
- [ ] Theme persists across page refreshes
- [ ] Theme persists across sessions (localStorage)
- [ ] Admin always stays dark regardless of user preference
- [ ] No flash of wrong theme on page load (FOUC)

#### Task 6.3: Responsive Testing

Test on different screen sizes in both themes:
- [ ] Desktop (1920px, 1440px)
- [ ] Tablet (768px, 1024px)
- [ ] Mobile (375px, 390px, 414px)
- [ ] Mobile landscape

#### Task 6.4: Browser Testing

Test in major browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

#### Task 6.5: Accessibility Testing

- [ ] Color contrast ratios meet WCAG AA (4.5:1 for text)
- [ ] Focus indicators visible in both themes
- [ ] Screen reader compatibility
- [ ] Keyboard navigation works
- [ ] Reduced motion preferences respected

#### Task 6.6: Performance Testing

- [ ] No layout shift when switching themes
- [ ] Theme switch is instant (< 100ms perceived)
- [ ] No performance degradation
- [ ] LocalStorage working correctly

### PHASE 7: Documentation (Estimated: 1 hour)

#### Task 7.1: Update README
Add section about theme support:
```markdown
## Theme Support

CambioCromos supports light mode, dark mode, and system preference.

### Changing Theme
Navigate to Settings (Ajustes) → System tab → Theme selector

### For Developers
- Theme state managed by `ThemeProvider` in `src/components/providers/ThemeProvider.tsx`
- Use `useTheme()` hook to access current theme
- Dark mode uses Tailwind's `dark:` variant classes
- Admin console always uses dark theme regardless of user preference
```

#### Task 7.2: Add Code Comments
Add comments to critical files:
- ThemeProvider: Explain how it works
- Admin layout: Explain override logic
- Key components: Note dark mode implementation

#### Task 7.3: Update Component Documentation
If you have Storybook or component docs, update them to show both theme variants.

## File Checklist Summary

### New Files to Create (2 files):
- [ ] `src/components/providers/ThemeProvider.tsx`
- [ ] `src/components/settings/ThemeSettingsSection.tsx`

### Files to Modify:

#### Core Infrastructure (3 files):
- [ ] `src/app/layout.tsx` (add ThemeProvider, add anti-FOUC script)
- [ ] `src/app/admin/layout.tsx` (add override logic)
- [ ] `tailwind.config.ts` (verify dark mode config)

#### UI Primitives (17 files):
- [ ] `src/components/ui/dialog.tsx`
- [ ] `src/components/ui/alert-dialog.tsx`
- [ ] `src/components/ui/input.tsx`
- [ ] `src/components/ui/textarea.tsx`
- [ ] `src/components/ui/select.tsx`
- [ ] `src/components/ui/dropdown-menu.tsx`
- [ ] `src/components/ui/button.tsx`
- [ ] `src/components/ui/modern-card.tsx`
- [ ] `src/components/ui/badge.tsx`
- [ ] `src/components/ui/alert.tsx`
- [ ] `src/components/ui/checkbox.tsx`
- [ ] `src/components/ui/tabs.tsx`
- [ ] `src/components/ui/label.tsx`
- [ ] `src/components/ui/QuantityStepper.tsx`
- [ ] `src/components/ui/user-link.tsx`
- [ ] `src/components/ui/empty-state.tsx`
- [ ] `src/components/ui/SegmentedTabs.tsx`

#### Layout Components (4 files):
- [ ] `src/components/site-header.tsx`
- [ ] `src/components/navigation/MobileBottomNav.tsx`
- [ ] `src/components/navigation/FloatingActionBtn.tsx`
- [ ] `src/components/layout/SiteFooter.tsx`

#### Page Components (26 files):
- [ ] `src/app/marketplace/page.tsx`
- [ ] `src/app/marketplace/create/page.tsx`
- [ ] `src/app/marketplace/my-listings/page.tsx`
- [ ] `src/app/marketplace/favorites/page.tsx`
- [ ] `src/app/marketplace/[id]/page.tsx`
- [ ] `src/app/marketplace/[id]/edit/page.tsx`
- [ ] `src/app/marketplace/[id]/chat/page.tsx`
- [ ] `src/app/marketplace/reservations/page.tsx`
- [ ] `src/app/users/[userId]/page.tsx`
- [ ] `src/app/(authenticated)/profile/page.tsx`
- [ ] `src/app/(authenticated)/profile/reset-password/page.tsx`
- [ ] `src/app/(authenticated)/profile/ignored/page.tsx`
- [ ] `src/app/(authenticated)/completar-perfil/page.tsx`
- [ ] `src/app/mis-plantillas/page.tsx`
- [ ] `src/app/mis-plantillas/[copyId]/page.tsx`
- [ ] `src/app/albumenes/page.tsx`
- [ ] `src/app/albumenes/[albumId]/page.tsx`
- [ ] `src/app/(authenticated)/ajustes/page.tsx`
- [ ] `src/components/settings/NotificationSettingsTab.tsx`
- [ ] `src/components/settings/IgnoredUsersTab.tsx`
- [ ] `src/components/settings/SystemSettingsTab.tsx`
- [ ] `src/app/page.tsx`
- [ ] `src/app/chats/page.tsx`
- [ ] `src/app/login/page.tsx`
- [ ] `src/app/signup/page.tsx`
- [ ] `src/app/forgot-password/page.tsx`

#### Marketplace Components (10 files):
- [ ] `src/components/marketplace/ListingCard.tsx`
- [ ] `src/components/marketplace/ListingFavoriteButton.tsx`
- [ ] `src/components/integration/MyListingCard.tsx`
- [ ] `src/components/marketplace/CreateListingModal.tsx`
- [ ] `src/components/marketplace/EditListingModal.tsx`
- [ ] `src/components/marketplace/ReserveListingModal.tsx`
- [ ] `src/components/marketplace/CompleteListingModal.tsx`
- [ ] `src/components/marketplace/CancelReservationModal.tsx`
- [ ] `src/components/marketplace/ListingFilters.tsx`
- [ ] `src/components/marketplace/SearchBar.tsx`

#### Template Components (8 files):
- [ ] `src/components/templates/TemplateProgressGrid.tsx`
- [ ] `src/components/templates/SlotTile.tsx`
- [ ] `src/components/templates/TemplateSummaryHeader.tsx`
- [ ] `src/components/templates/QuickEntryModal.tsx`
- [ ] `src/components/templates/ManualSlotModal.tsx`
- [ ] `src/components/templates/BulkEntryModal.tsx`
- [ ] `src/components/templates/TemplateStatsCard.tsx`
- [ ] `src/components/templates/AlbumCard.tsx`

#### Profile Components (6 files):
- [ ] `src/components/profile/ProfileHeader.tsx`
- [ ] `src/components/profile/ProfileStats.tsx`
- [ ] `src/components/profile/ProfileBadges.tsx`
- [ ] `src/components/profile/ProfileBadgesSimple.tsx`
- [ ] `src/components/profile/UserAvatarDropdown.tsx`
- [ ] `src/components/profile/ProfileCompletionGuard.tsx`

#### Modal Components (10+ files):
- [ ] `src/components/legal/TermsModal.tsx`
- [ ] `src/components/legal/PrivacyModal.tsx`
- [ ] `src/components/social/ShareModal.tsx`
- [ ] `src/components/social/ReportModal.tsx`
- [ ] Other modal components (search codebase for *Modal.tsx)

#### Skeleton/Loading Components (5+ files):
- [ ] `src/components/skeletons/ListingCardSkeleton.tsx`
- [ ] `src/components/skeletons/ProfileSkeleton.tsx`
- [ ] `src/components/skeletons/TemplateSkeleton.tsx`
- [ ] `src/app/loading.tsx`
- [ ] Other skeleton components

#### Home Components (4 files):
- [ ] `src/components/home/Hero.tsx`
- [ ] `src/components/home/FeatureHighlights.tsx`
- [ ] `src/components/home/HowItWorks.tsx`
- [ ] `src/components/home/MarketplaceShowcase.tsx`

**Total Files:** ~100 files (2 new, ~98 modified)

## Estimated Timeline

| Phase | Duration | Type |
|-------|----------|------|
| Phase 1: Infrastructure | 2-3 hours | Development |
| Phase 2: Settings UI | 1 hour | Development |
| Phase 3: Admin Override | 30 min | Development |
| Phase 4: Component Updates | 10-15 hours | Development |
| Phase 5: Special Cases | 2 hours | Development |
| Phase 6: Testing | 3-4 hours | QA |
| Phase 7: Documentation | 1 hour | Documentation |
| **TOTAL** | **19-26 hours** | **Full Implementation** |

## Success Criteria

- [ ] User can select Light/Dark/System theme in settings
- [ ] Theme preference persists across sessions
- [ ] All pages render correctly in both light and dark modes
- [ ] Admin console always stays in dark mode
- [ ] No flash of unstyled content (FOUC) on page load
- [ ] Theme switching is instant and smooth
- [ ] All interactive elements work in both themes
- [ ] Color contrast meets WCAG AA standards in both themes
- [ ] Works across all supported browsers and devices
- [ ] No console errors or warnings

## Notes for Implementation Agent

### Important Reminders:
1. **Don't remove existing light mode styles** - Add dark mode variants alongside them
2. **Test frequently** - Check theme switching after each major component update
3. **Use the pattern consistently** - Follow the color mapping table religiously
4. **Preserve admin dark mode** - The admin override is critical
5. **Brand color stays mostly the same** - #FFC000 works well in both themes
6. **Check contrast** - Use browser DevTools to verify WCAG compliance
7. **Mobile first** - Test responsive behavior in both themes

### Common Pitfalls to Avoid:
- ❌ Forgetting to add dark variants to hover states
- ❌ Hardcoding colors instead of using Tailwind utilities
- ❌ Not testing theme persistence (localStorage)
- ❌ Forgetting focus states in dark mode
- ❌ Not handling shadows properly (often need to be removed/changed in dark)
- ❌ Overlooking nested components that inherit colors

### Pro Tips:
- ✅ Use VS Code search/replace for bulk className updates
- ✅ Work in phases - UI primitives first, then cascade to pages
- ✅ Keep browser DevTools open with both themes side-by-side
- ✅ Use Tailwind IntelliSense for autocompletion
- ✅ Commit frequently with descriptive messages
- ✅ Take screenshots before/after for reference

## Ready to Start?

This plan is complete and ready for implementation. The next agent should:
1. Review this entire document
2. Set up a todo list with all phases and tasks
3. Begin with Phase 1 (Theme Infrastructure)
4. Work systematically through each phase
5. Test thoroughly at each stage
6. Mark tasks complete as they finish

Good luck! 🚀
