/**
 * Minimum required native Android version code.
 *
 * If the user's installed app has a versionCode BELOW this number,
 * they will see a full-screen blocking update screen.
 *
 * Update this value whenever you release a build that contains breaking
 * native changes (new Capacitor plugins, AndroidManifest changes, etc.)
 * that cannot be hot-patched via Vercel.
 *
 * Current history:
 *   10604  — 1.6.3  (AdMob native plugin — first version requiring this check)
 */
export const MIN_ANDROID_VERSION_CODE = 10604;

/** Google Play Store deep-link for the app. Used in the force-update screen. */
export const PLAY_STORE_URL =
    'https://play.google.com/store/apps/details?id=com.cambiocromos.app';
