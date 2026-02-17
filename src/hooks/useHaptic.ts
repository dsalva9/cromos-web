import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import { isPWA, supportsVibration } from '@/lib/platform';

export function useHaptic() {
  const hapticImpact = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Switch to simple vibrate for better compatibility on Samsung devices
        await Haptics.vibrate({ duration: 10 });
      } catch (e) {
        logger.warn('Haptics error', e);
      }
    } else if (isPWA() && supportsVibration()) {
      // PWA fallback: Vibration API (works on Android, silently ignored on iOS)
      try {
        navigator.vibrate(10);
      } catch {
        // Silently ignore — vibration is a nice-to-have
      }
    } else {
      logger.debug('Haptics skipped: Not native platform');
    }
  }, []);

  const hapticSelection = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
      } catch (e) {
        logger.warn('Haptics selection not available', e);
      }
    } else if (isPWA() && supportsVibration()) {
      try {
        navigator.vibrate([5, 5, 5]);
      } catch {
        // Silently ignore
      }
    }
  }, []);

  const hapticVibrate = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.vibrate();
      } catch (e) {
        logger.warn('Haptics vibrate not available', e);
      }
    } else if (isPWA() && supportsVibration()) {
      try {
        navigator.vibrate(50);
      } catch {
        // Silently ignore
      }
    }
  }, []);

  return {
    hapticImpact,
    hapticSelection,
    hapticVibrate,
  };
}
