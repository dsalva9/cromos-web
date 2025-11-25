# Responsive Layout Guide

**Version**: 1.6.0

This document explains the responsive layout system used in CambioCromos to ensure proper display across all screen sizes, especially the tablet range (768px-1024px).

---

## Problem Solved

Previously, the application showed white borders on tablet screens (768px-1024px) due to Tailwind's default container behavior applying restrictive max-widths at these breakpoints.

---

## Solution

### 1. Tailwind Container Configuration

The container is configured to use full viewport width on mobile and tablet screens, with max-width constraints only on large desktops:

```typescript
// tailwind.config.ts
theme: {
  container: {
    center: true,
    padding: {
      DEFAULT: '1rem',
      sm: '1rem',
      md: '1rem',
      lg: '1rem',
      xl: '1rem',
      '2xl': '1rem',
    },
    screens: {
      sm: '100%',      // Full width on small screens
      md: '100%',      // Full width on tablets (768px)
      lg: '100%',      // Full width on tablets (1024px)
      xl: '1280px',    // Max width on large desktops
      '2xl': '1536px', // Max width on extra large screens
    },
  },
}
```

### 2. Global Background & Overflow Settings

To prevent white borders from showing through and prevent horizontal scrolling:

```css
/* src/app/globals.css */
html,
body {
  margin: 0;
  padding: 0;
  background: #1F2937;  /* Dark background matching theme */
  width: 100%;
  overflow-x: hidden;   /* Prevent horizontal scroll */
}
```

### 3. Root Layout Configuration

```tsx
/* src/app/layout.tsx */
<html lang="en" data-theme="light" className="overflow-x-hidden">
  <body
    className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-[#1F2937] text-foreground antialiased overflow-x-hidden`}
  >
    {/* App content */}
  </body>
</html>
```

---

## Breakpoint Behavior

### Mobile (< 768px)
- Container: `100%` width
- Padding: `1rem` (16px)
- Behavior: Full width with padding

### Tablet (768px - 1024px)
- Container: `100%` width
- Padding: `1rem` (16px)
- Behavior: **Full width with padding (no white borders)**

### Desktop (> 1024px)
- Container: Max-width `1280px` (xl) or `1536px` (2xl)
- Padding: `1rem` (16px)
- Behavior: Centered with max-width constraint

---

## Usage Guidelines

### Standard Page Layout

```tsx
export default function Page() {
  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Page content */}
      </div>
    </div>
  );
}
```

### Header Component

```tsx
<header className="sticky top-0 z-50 bg-gray-900 border-b-2 border-black">
  <div className="container mx-auto px-4">
    <div className="flex h-16 items-center justify-between">
      {/* Header content */}
    </div>
  </div>
</header>
```

### Footer Component

```tsx
<footer className="border-t">
  <div className="container mx-auto px-4 py-6 text-sm text-muted-foreground">
    {/* Footer content */}
  </div>
</footer>
```

### Mobile Navigation Layout

On mobile devices (< 768px), the layout shifts to a native-app style:

1.  **Bottom Navigation**: A fixed `MobileBottomNav` bar provides quick access to primary sections (Marketplace, Albums, Chats, Favorites, Menu).
2.  **Floating Action Button (FAB)**: A context-aware `FloatingActionBtn` appears on specific pages (Marketplace, Templates) for primary creation actions.
3.  **Simplified Header**: The `SiteHeader` is simplified to show only the logo, notifications, and profile link. The hamburger menu is removed in favor of the bottom nav's "More" drawer.
4.  **Safe Areas**: Bottom padding is added to the main content to prevent obstruction by the fixed bottom nav (`pb-[calc(4rem+env(safe-area-inset-bottom))]`).

---

## Testing

To verify the responsive layout works correctly:

1. Open the application in a browser
2. Open developer tools (F12)
3. Toggle responsive mode
4. Test the following widths:
   - 375px (mobile)
   - 768px (tablet start)
   - 900px (tablet mid)
   - 1024px (tablet end)
   - 1280px (desktop)
   - 1920px (large desktop)

5. Verify:
   - No white borders at any width
   - Content fills viewport on mobile/tablet
   - Content is centered on desktop
   - No horizontal scrolling at any width

---

## Troubleshooting

### White Borders Still Appearing

Check:
1. `html` and `body` have `background: #1F2937` in globals.css
2. `body` has `bg-[#1F2937]` class in layout.tsx
3. Container configuration in tailwind.config.ts is correct
4. No custom max-width styles on parent elements

### Horizontal Scrolling

Check:
1. `html` has `overflow-x: hidden` in globals.css
2. `html` has `className="overflow-x-hidden"` in layout.tsx
3. `body` has `overflow-x-hidden` class in layout.tsx
4. No elements exceeding viewport width

---

## Related Files

- `tailwind.config.ts` - Container configuration
- `src/app/globals.css` - Global styles
- `src/app/layout.tsx` - Root layout
- `src/components/site-header.tsx` - Header component
- All page components using `container mx-auto px-4`

---

**Last Updated**: 2025-10-22
**Related Issue**: White border bug in tablet range (768px-1024px)
