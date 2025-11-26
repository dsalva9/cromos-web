# Mobile Strategy: Capacitor MVP

## Objective
Release an Android MVP for Cromos using Capacitor. This approach allows us to wrap the live Next.js Vercel deployment, minimizing code divergence and maintenance overhead.

## Tech Stack
- **Core:** Capacitor Core
- **Platform:** Capacitor Android
- **Plugins:**
  - `@capacitor/camera` (Native camera integration)
  - `@capacitor/preferences` (Native storage if needed)
  - `@capacitor/splash-screen`
  - `@capacitor/status-bar`
- **Push Notifications:** OneSignal (via Capacitor plugin)

## Constraints
1.  **Zero Separate Branches:** We will NOT maintain a separate `mobile` branch. The `main` branch must serve both Web and Mobile.
2.  **Unified Codebase:** Use `process.env` checks or runtime context detection (e.g., `Capacitor.isNativePlatform()`) to handle mobile-specific logic.
3.  **Vercel Deployment:** The mobile app will point to the live Vercel URL, not a local static bundle (initially). This ensures instant updates via Vercel deployments (Over-The-Air updates effectively).

## Phases

### Phase 1: Wrapper + Native Camera + Push Notifications
- **Goal:** Get the app on the Play Store.
- **Features:**
  - WebView wrapping the production URL.
  - Native Camera intent for uploading stickers/profile pictures.
  - OneSignal integration for push notifications (chat, trades).
  - Basic deep linking support.
  - **Technical Tasks:**
    - [x] **Viewport & Safe Areas:** Fix `viewport` meta tag (disable zoom/scale) and implement `safe-area-inset-*` for headers/footers.
    - [x] **Mobile Interactions:** Remove `autoFocus` on mobile inputs and fix sticky `hover` states using `@media (hover: hover)`.
    - [x] **Input Handling:** Audit inputs for correct `inputMode` (numeric/decimal) to trigger appropriate mobile keyboards.

### Phase 2: UI Polish & Native Feel
- **Goal:** Make it feel less like a website.
- **Tasks:**
  - **Navigation Redesign:** Implement fixed bottom navigation bar and FAB for key actions.
  - Handle "Safe Areas" (notch, status bar, home indicator) via CSS env variables.
  - Implement Haptic Feedback on interactions.
  - Disable browser-specific UI (text selection, callouts, tap highlights).
  - Improve "Pull-to-refresh" behavior or disable it in favor of native-like navigation.
  - **Splash Screen:** Add a native splash screen for better launch experience.
  - **Push Notifications:** Enable and configure OneSignal push notifications.
  - **Technical Tasks:**
    - [x] **Bottom Navigation:** Create `MobileBottomNav` component.
    - [x] **FAB:** Create `FloatingActionBtn` component.
    - [x] **CSS Architecture:** Implement a Z-Index scale to prevent stacking issues.
    - [x] **Overscroll:** Add `overscroll-behavior-y: none` to prevent browser bounce/pull-to-refresh.
    - [x] **Splash Screen:** Generated assets and configured plugin.
    - [x] **Haptics:** Implemented `useHaptic` hook and applied to navigation.
    - [x] **Safe Areas:** Configured CSS `env(safe-area-inset-*)`.

### Phase 3: Future Migration
- **Trigger:** If performance becomes a bottleneck or native feature requirements exceed Capacitor's capabilities.
- **Path:** Migrate to React Native (Expo). This is a long-term consideration and not part of the MVP.
