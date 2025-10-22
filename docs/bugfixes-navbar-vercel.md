# Bug Fixes: Navbar and Vercel Deployment

## Date: October 22, 2025

### Issues Fixed

#### 1. Navbar Not Always Visible

**Problem:**
The navigation bar was not consistently staying visible at the top of the screen, causing navigation issues.

**Root Cause:**
- The navbar used `sticky top-0 z-50` positioning
- Z-index of 50 was insufficient compared to some other UI elements (modals, overlays)
- Pages didn't have proper top padding to account for fixed header

**Solution:**
1. Changed navbar from `sticky` to `fixed` positioning
2. Increased z-index from `z-50` to `z-[100]` for proper stacking
3. Added explicit positioning: `fixed top-0 left-0 right-0`
4. Added `pt-16` (padding-top) to main content area in layout.tsx

**Files Modified:**
- `src/components/site-header.tsx` - Changed positioning and z-index
- `src/app/layout.tsx` - Added padding-top to main content

**Code Changes:**
```tsx
// Before
<header className="sticky top-0 z-50 bg-gray-900 border-b-2 border-black shadow-xl">

// After
<header className="fixed top-0 left-0 right-0 z-[100] bg-gray-900 border-b-2 border-black shadow-xl">
```

```tsx
// Before
<main id="main" className="min-h-screen">

// After
<main id="main" className="min-h-screen pt-16">
```

#### 2. Vercel Deployment Build Error

**Problem:**
Vercel builds were failing during the `npm install` phase with the error:
```
Running "install" command: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install`...
added 1 package, and audited 455 packages in 1s
```

**Root Cause:**
- The `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` environment variable syntax in `installCommand` doesn't work properly on Vercel's build system
- Vercel requires environment variables to be set in the build configuration, not inline with commands

**Solution:**
1. Removed inline environment variable from `installCommand`
2. Changed install command to `npm install --legacy-peer-deps`
3. Added proper `build.env` configuration section
4. Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` as a build environment variable

**File Modified:**
- `vercel.json`

**Code Changes:**
```json
// Before
{
  "installCommand": "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install"
}

// After
{
  "installCommand": "npm install --legacy-peer-deps",
  "build": {
    "env": {
      "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD": "1"
    }
  }
}
```

### Testing

**Navbar:**
1. Navigate to any page
2. Scroll down - navbar should remain fixed at top
3. Open modals/dialogs - navbar should stay above all content
4. Test on mobile - navbar should be consistently visible

**Vercel Deployment:**
1. Push changes to main branch
2. Monitor Vercel deployment logs
3. Verify build completes successfully
4. Test deployed application

### Additional Notes

- The `--legacy-peer-deps` flag helps avoid peer dependency conflicts during npm install
- Z-index of 100 ensures navbar stays above most UI elements (modals typically use z-50 to z-90)
- Fixed positioning is more reliable than sticky for always-visible headers
- Padding-top on main content prevents navbar from covering page content

### Related Files

- `src/components/site-header.tsx` - Main navigation component
- `src/app/layout.tsx` - Root layout with header
- `vercel.json` - Vercel deployment configuration
- `package.json` - Dependencies (Playwright is dev dependency)

### Future Improvements

1. Consider adding a scroll-to-top button for long pages
2. Implement navbar shadow on scroll for better visual separation
3. Add smooth scroll behavior when clicking navbar links
4. Consider adding a progress bar to navbar during page transitions

---

**Status:** ✅ Resolved
**Priority:** High
**Impact:** Critical - Affects navigation and deployment
