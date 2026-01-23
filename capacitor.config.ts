import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cambiocromos.app',
  appName: 'CambioCromos',
  webDir: 'public',
  server: {
    url: 'https://cromos-web.vercel.app',
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
      launchShowDuration: 2000,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
