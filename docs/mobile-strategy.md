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
    - [ ] **Viewport & Safe Areas:** Fix `viewport` meta tag (disable zoom/scale) and implement `safe-area-inset-*` for headers/footers.
    - [ ] **Mobile Interactions:** Remove `autoFocus` on mobile inputs and fix sticky `hover` states using `@media (hover: hover)`.
    - [ ] **Input Handling:** Audit inputs for correct `inputMode` (numeric/decimal) to trigger appropriate mobile keyboards.

### Phase 2: UI Polish & Native Feel
- **Goal:** Make it feel less like a website.
- **Tasks:**
  - Handle "Safe Areas" (notch, status bar, home indicator) via CSS env variables.
  - Implement Haptic Feedback on interactions.
  - Disable browser-specific UI (text selection, callouts, tap highlights).
  - Improve "Pull-to-refresh" behavior or disable it in favor of native-like navigation.
  - **Technical Tasks:**
    - [ ] **CSS Architecture:** Implement a Z-Index scale to prevent stacking issues.
    - [ ] **Overscroll:** Add `overscroll-behavior-y: none` to prevent browser bounce/pull-to-refresh.

### Phase 3: Future Migration
- **Trigger:** If performance becomes a bottleneck or native feature requirements exceed Capacitor's capabilities.
- **Path:** Migrate to React Native (Expo). This is a long-term consideration and not part of the MVP.
