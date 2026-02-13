import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cambiocromos.app',
  appName: 'CambioCromos',
  webDir: 'public',
  server: {
    url: 'https://cambiocromos.com',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      // keystorePath: undefined,
      // keystoreAlias: undefined,
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      androidScaleType: "FIT_CENTER",
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
