import { Capacitor, registerPlugin } from '@capacitor/core';

interface DeviceFingerprintPlugin {
  getFingerprint(): Promise<{ hash: string }>;
}

const DeviceFingerprint = registerPlugin<DeviceFingerprintPlugin>('DeviceFingerprint');

/**
 * Gets the device fingerprint hash (SHA-256 of ANDROID_ID).
 * Returns null on non-native platforms (web).
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const { hash } = await DeviceFingerprint.getFingerprint();
    return hash;
  } catch (error) {
    console.warn('[DeviceFingerprint] Failed to get fingerprint:', error);
    return null;
  }
}
