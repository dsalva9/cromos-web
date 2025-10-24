# Sprint 12: Manual Testing Guide

**Version**: 1.0
**Date**: October 24, 2025
**Sprint**: Sprint 12 - Polish & Testing

## Overview

This guide provides comprehensive manual testing procedures for all features implemented in Sprint 12, including loading states, error handling, accessibility improvements, performance optimizations, and admin panel functionality.

---

## Pre-Testing Setup

### Environment Preparation
1. Clear browser cache and cookies
2. Test in multiple browsers:
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari (if available)
3. Test in different viewport sizes:
   - Mobile (375px width)
   - Tablet (768px width)
   - Desktop (1920px width)
4. Prepare test accounts:
   - Regular user account
   - Admin user account
   - Account with no data (new user)

### Tools Needed
- Browser DevTools (Network tab, Console)
- Screen reader (NVDA for Windows, VoiceOver for Mac)
- Lighthouse (built into Chrome DevTools)
- axe DevTools browser extension (optional)

---

## Test Suite 1: Loading Skeletons (Subtask 12.1)

### 12.1.1 Marketplace Page Loading

**Steps:**
1. Navigate to `/marketplace`
2. Open DevTools Network tab and throttle to "Slow 3G"
3. Hard refresh the page (Ctrl+Shift+R)

**Expected Results:**
- [ ] 8 skeleton cards appear immediately
- [ ] Skeletons match the layout of actual listing cards
- [ ] Skeletons have shimmer/pulse animation
- [ ] When data loads, skeletons smoothly transition to actual cards
- [ ] No layout shift occurs during the transition

**Pass/Fail**: ___________

---

### 12.1.2 Templates Page Loading

**Steps:**
1. Navigate to `/templates`
2. Throttle network to "Slow 3G"
3. Hard refresh the page

**Expected Results:**
- [ ] 6 skeleton cards appear immediately
- [ ] Skeletons use aspect-video ratio (different from marketplace)
- [ ] Smooth transition when templates load
- [ ] No "flash of unstyled content"

**Pass/Fail**: ___________

---

### 12.1.3 My Listings Page Loading

**Steps:**
1. Log in as a user with listings
2. Navigate to `/marketplace/my-listings`
3. Throttle network and refresh
4. Test each tab: Active, Inactive, Drafts

**Expected Results:**
- [ ] Each tab shows skeleton loaders while fetching
- [ ] Skeletons match the listing card layout
- [ ] Tab switching shows loaders for new data
- [ ] Empty tabs show proper empty state (not skeletons)

**Pass/Fail**: ___________

---

### 12.1.4 Empty States

**Steps:**
1. Create a new test account with no data
2. Navigate to `/marketplace/my-listings`
3. Check all three tabs

**Expected Results:**
- [ ] Empty state component displays with icon
- [ ] Clear message: "No [active/inactive/draft] listings"
- [ ] CTA button present (e.g., "Create listing")
- [ ] No skeleton loaders shown for empty states

**Pass/Fail**: ___________

---

### 12.1.5 LazyImage Component

**Steps:**
1. Navigate to any page with images (marketplace, templates)
2. Throttle network to "Slow 3G"
3. Scroll down to reveal more images

**Expected Results:**
- [ ] Images show placeholder/skeleton while loading
- [ ] Smooth opacity transition when image loads (0 to 1)
- [ ] Broken images show fallback icon/state
- [ ] No "image flash" or layout shift

**Pass/Fail**: ___________

---

## Test Suite 2: Error Boundaries (Subtask 12.2)

### 12.2.1 Route-Level Error Handling

**Steps:**
1. Navigate to a non-existent route (e.g., `/this-does-not-exist`)
2. Note the error page appearance

**Expected Results:**
- [ ] Custom 404 error page displays
- [ ] Error page uses ModernCard design
- [ ] Spanish error message shown
- [ ] "Volver al inicio" (Back to home) button works
- [ ] "Reportar problema" (Report issue) button works

**Pass/Fail**: ___________

---

### 12.2.2 Component Error Boundary

**Steps:**
1. If in development mode, trigger a component error
2. Check ErrorBoundary component behavior

**Expected Results:**
- [ ] Error boundary catches the error
- [ ] User-friendly error message displayed
- [ ] In dev mode: error details and stack trace visible
- [ ] In production: generic error message (no stack trace)
- [ ] "Try again" button resets error boundary

**Pass/Fail**: ___________

---

### 12.2.3 Global Error Handler

**Steps:**
1. Simulate a critical application error (if possible)
2. Check global-error.tsx behavior

**Expected Results:**
- [ ] Critical errors caught at app level
- [ ] User can still navigate away
- [ ] Error doesn't break entire application
- [ ] Error logged to console (check DevTools)

**Pass/Fail**: ___________

---

### 12.2.4 Route Loading States

**Steps:**
1. Navigate between pages with network throttled
2. Observe transition states

**Expected Results:**
- [ ] Loading spinner appears during page transitions
- [ ] Loading state centered and visible
- [ ] No blank screen during navigation
- [ ] Smooth transition to loaded page

**Pass/Fail**: ___________

---

## Test Suite 3: Accessibility (Subtask 12.3)

### 12.3.1 Keyboard Navigation

**Steps:**
1. Navigate to homepage using only keyboard
2. Press Tab key repeatedly through all interactive elements
3. Press Shift+Tab to navigate backward

**Expected Results:**
- [ ] All interactive elements receive focus
- [ ] Focus indicator is clearly visible (2px solid #FFC000 outline)
- [ ] Focus order follows logical page structure
- [ ] No focus traps or unexpected focus jumps
- [ ] Buttons, links, inputs all keyboard accessible

**Pass/Fail**: ___________

---

### 12.3.2 Skip to Content Link

**Steps:**
1. Navigate to any page
2. Press Tab key once (before clicking anything)
3. Observe the skip link
4. Press Enter on the skip link

**Expected Results:**
- [ ] "Skip to content" link appears on first Tab press
- [ ] Link is visually prominent and styled
- [ ] Pressing Enter jumps focus to main content
- [ ] Link has proper focus styles
- [ ] Link works on all pages

**Pass/Fail**: ___________

---

### 12.3.3 Screen Reader Testing

**Steps:**
1. Enable screen reader (NVDA/VoiceOver)
2. Navigate through marketplace page
3. Test form inputs and buttons
4. Check image alt texts

**Expected Results:**
- [ ] All images have descriptive alt text
- [ ] Buttons have clear labels
- [ ] Form inputs have associated labels
- [ ] ARIA labels present where needed
- [ ] Screen reader announces all interactive elements correctly
- [ ] Hidden decorative elements have aria-hidden="true"

**Pass/Fail**: ___________

---

### 12.3.4 Color Contrast

**Steps:**
1. Open Lighthouse in Chrome DevTools
2. Run accessibility audit
3. Check color contrast ratios

**Expected Results:**
- [ ] All text has minimum 4.5:1 contrast ratio (WCAG AA)
- [ ] Large text has minimum 3:1 contrast ratio
- [ ] Focus indicators have sufficient contrast
- [ ] No color-only indicators (use icons + color)

**Pass/Fail**: ___________

---

### 12.3.5 Responsive Focus Management

**Steps:**
1. Open a modal/dialog
2. Navigate with keyboard
3. Close modal

**Expected Results:**
- [ ] Focus moves to modal when opened
- [ ] Focus trapped within modal (can't tab to background)
- [ ] Escape key closes modal
- [ ] Focus returns to trigger element when closed

**Pass/Fail**: ___________

---

## Test Suite 4: Performance (Subtask 12.4)

### 12.4.1 Image Optimization

**Steps:**
1. Navigate to marketplace
2. Open DevTools Network tab
3. Filter by "Img"
4. Check image formats and sizes

**Expected Results:**
- [ ] Modern image formats used (AVIF, WebP)
- [ ] Appropriate image sizes for viewport
- [ ] No unnecessarily large images loaded
- [ ] Images lazy load as you scroll
- [ ] Responsive images use correct srcset

**Pass/Fail**: ___________

---

### 12.4.2 Client-Side Caching

**Steps:**
1. Navigate to marketplace
2. Wait for data to load
3. Navigate away and return to marketplace within 5 minutes
4. Check Network tab

**Expected Results:**
- [ ] Second load doesn't make duplicate API calls
- [ ] Data served from cache (check console logs)
- [ ] Cache expires after 5 minutes
- [ ] Fresh data fetched after cache expiration

**Pass/Fail**: ___________

---

### 12.4.3 Bundle Size Optimization

**Steps:**
1. Run `npm run build`
2. Check build output for bundle sizes
3. Compare with previous builds (if available)

**Expected Results:**
- [ ] Build completes without warnings
- [ ] Package imports optimized (lucide-react, date-fns)
- [ ] No console logs in production build
- [ ] Tree shaking applied to unused exports

**Pass/Fail**: ___________

---

### 12.4.4 Lighthouse Performance Audit

**Steps:**
1. Open incognito/private window
2. Navigate to marketplace
3. Run Lighthouse performance audit
4. Record scores

**Expected Results:**
- [ ] Performance score: 90+ (mobile)
- [ ] Performance score: 95+ (desktop)
- [ ] First Contentful Paint: < 1.8s
- [ ] Largest Contentful Paint: < 2.5s
- [ ] Total Blocking Time: < 300ms
- [ ] Cumulative Layout Shift: < 0.1

**Scores**:
- Mobile: _________
- Desktop: _________

**Pass/Fail**: ___________

---

### 12.4.5 Network Performance

**Steps:**
1. Open DevTools Network tab
2. Hard refresh marketplace page
3. Wait for full page load

**Expected Results:**
- [ ] Total page load time < 3s (Fast 3G)
- [ ] API requests complete in reasonable time
- [ ] No redundant requests
- [ ] Proper HTTP caching headers
- [ ] Gzip/Brotli compression enabled

**Pass/Fail**: ___________

---

## Test Suite 5: Admin Panel (Bonus Fixes)

### 12.5.1 Admin Dashboard - Stats

**Steps:**
1. Log in as admin user
2. Navigate to `/admin/dashboard`
3. Wait for stats to load

**Expected Results:**
- [ ] Dashboard loads without errors
- [ ] Stats cards display correct numbers:
  - Total users
  - Active listings
  - Pending reports
  - Recent actions
- [ ] No 404 errors in console
- [ ] All data loads successfully

**Pass/Fail**: ___________

---

### 12.5.2 Admin Panel - Reports Tab

**Steps:**
1. On admin dashboard, click "Reports" tab
2. Wait for pending reports to load
3. Scroll through the list

**Expected Results:**
- [ ] Pending reports list loads successfully
- [ ] Each report shows:
  - Reporter nickname
  - Entity type (user/listing/message)
  - Entity ID (numeric)
  - Reason
  - Description
  - Created date
- [ ] No type mismatch errors
- [ ] Pagination works (if applicable)

**Pass/Fail**: ___________

---

### 12.5.3 Admin Panel - Users Tab

**Steps:**
1. Click "Users" tab in admin panel
2. Wait for user list to load
3. Try searching for a user by email
4. Try filtering by status (active/suspended)

**Expected Results:**
- [ ] User list loads with all fields:
  - User ID (UUID)
  - Email address (from auth.users)
  - Nickname
  - Avatar
  - Admin status
  - Suspended status
  - Rating average
  - Rating count
  - Active listings count
  - Reports received count
- [ ] Email search works correctly
- [ ] Nickname search works correctly
- [ ] Status filters work (all/active/suspended)
- [ ] No "column does not exist" errors

**Pass/Fail**: ___________

---

### 12.5.4 Admin Panel - Audit Tab

**Steps:**
1. Click "Audit" tab in admin panel
2. Wait for audit log to load
3. Check recent actions

**Expected Results:**
- [ ] Audit log loads from `audit_log` table
- [ ] Each entry shows:
  - Admin user who performed action
  - Action type (formatted, underscores replaced with spaces)
  - Target entity
  - Timestamp
- [ ] No "undefined action_type" errors
- [ ] Actions sorted by most recent first

**Pass/Fail**: ___________

---

### 12.5.5 Admin Panel - Authorization

**Steps:**
1. Log out admin account
2. Log in as regular user (non-admin)
3. Try to access `/admin/dashboard`

**Expected Results:**
- [ ] Non-admin users redirected or shown error
- [ ] RPC functions return "Access denied" error
- [ ] No sensitive data exposed to non-admins
- [ ] Proper SECURITY DEFINER functions with admin checks

**Pass/Fail**: ___________

---

## Test Suite 6: Cross-Browser Testing

### 12.6.1 Chrome/Edge Testing

**Steps:**
1. Test all features above in Chrome/Edge
2. Check for any browser-specific issues

**Expected Results:**
- [ ] All features work as expected
- [ ] No console errors
- [ ] Styles render correctly

**Pass/Fail**: ___________

---

### 12.6.2 Firefox Testing

**Steps:**
1. Test all features above in Firefox
2. Check for any Firefox-specific issues

**Expected Results:**
- [ ] All features work as expected
- [ ] Focus styles render correctly
- [ ] No Firefox-specific bugs

**Pass/Fail**: ___________

---

### 12.6.3 Safari Testing (if available)

**Steps:**
1. Test all features above in Safari
2. Check for any WebKit-specific issues

**Expected Results:**
- [ ] All features work as expected
- [ ] Image formats supported
- [ ] No Safari-specific bugs

**Pass/Fail**: ___________

---

## Test Suite 7: Mobile Responsive Testing

### 12.7.1 Mobile Layout (375px)

**Steps:**
1. Set viewport to 375px width (iPhone SE)
2. Navigate through all pages
3. Test all interactive elements

**Expected Results:**
- [ ] All content readable and accessible
- [ ] No horizontal scrolling
- [ ] Touch targets at least 44x44px
- [ ] Skeletons render correctly
- [ ] Images optimized for mobile

**Pass/Fail**: ___________

---

### 12.7.2 Tablet Layout (768px)

**Steps:**
1. Set viewport to 768px width (iPad)
2. Navigate through all pages
3. Test layout breakpoints

**Expected Results:**
- [ ] Layout adapts appropriately
- [ ] No awkward spacing or overlap
- [ ] All features accessible
- [ ] Touch-friendly interface

**Pass/Fail**: ___________

---

## Regression Testing

### 12.8.1 Core Functionality

**Steps:**
1. Test that existing features still work:
   - User authentication
   - Listing creation
   - Template usage
   - Favorites
   - Search/filters
   - User profiles

**Expected Results:**
- [ ] All core features work as before
- [ ] No regressions introduced
- [ ] Data integrity maintained

**Pass/Fail**: ___________

---

## Final Checks

### 12.9.1 Production Build

**Steps:**
1. Run `npm run build`
2. Run `npm run start`
3. Test production build locally

**Expected Results:**
- [ ] Build completes successfully
- [ ] No build errors or warnings
- [ ] Production app runs correctly
- [ ] Console logs removed
- [ ] Sourcemaps not exposed

**Pass/Fail**: ___________

---

### 12.9.2 Environment Variables

**Steps:**
1. Check all required environment variables
2. Verify Supabase connection
3. Test in staging environment (if available)

**Expected Results:**
- [ ] All env vars configured correctly
- [ ] Database connection works
- [ ] API keys valid
- [ ] No hardcoded secrets

**Pass/Fail**: ___________

---

## Test Summary

### Overall Statistics

- **Total Tests**: 42
- **Tests Passed**: _______
- **Tests Failed**: _______
- **Tests Skipped**: _______
- **Pass Rate**: _______%

### Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Blocker Issues (Must Fix Before Deployment)

- [ ] None found
- [ ] Issues listed below:
  1. _______________________________________________
  2. _______________________________________________

---

## Sign-Off

**Tester Name**: ___________________________
**Date**: ___________________________
**Approved for Deployment**: YES / NO

**Notes**:
_________________________________________________________
_________________________________________________________
_________________________________________________________
_________________________________________________________

---

## Appendix: Quick Test Checklist

Use this for rapid smoke testing:

- [ ] Marketplace loads with skeletons
- [ ] Templates loads with skeletons
- [ ] 404 page works
- [ ] Tab navigation works
- [ ] Skip to content works
- [ ] Images load properly
- [ ] Admin dashboard loads
- [ ] Admin reports tab loads
- [ ] Admin users tab loads with emails
- [ ] Admin audit tab loads
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Lighthouse score > 90

**Quick Test Result**: PASS / FAIL
