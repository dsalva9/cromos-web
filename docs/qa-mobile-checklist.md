# QA Mobile Checklist

## Web Regression Tests
- [ ] **Window Object Availability**: Verify that Capacitor plugin imports/usage do not crash Server Side Rendering (SSR).
- [ ] **Conditional Logic**: Ensure file pickers and other web-specific interactions still work correctly on desktop browsers.
- [ ] **Layout Stability**: Verify that "safe-area" padding additions do not break the layout on desktop screens.

## Android Acceptance Tests
- [ ] **Session Persistence**:
    - [ ] Log in via Supabase Auth.
    - [ ] Kill the app completely (swipe away).
    - [ ] Restart the app.
    - [ ] Verify the user is still logged in (Cookie/LocalStorage handling in WebView).
- [ ] **Hardware Back Button**:
    - [ ] Navigate deep into the app.
    - [ ] Press the hardware back button.
    - [ ] Verify it triggers `router.back()` or closes the active modal.
    - [ ] Verify it does NOT exit the app unless on the home screen.
- [ ] **External Links**:
    - [ ] Click an external link (e.g., to a sponsor or help page).
    - [ ] Verify it opens in the System Browser (Chrome/Samsung Internet), NOT inside the internal WebView.
