import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';

export function useHaptic() {
  const hapticImpact = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Switch to simple vibrate for better compatibility on Samsung devices
        await Haptics.vibrate({ duration: 10 });
      } catch (e) {
        logger.warn('Haptics error', e);
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
    }
  }, []);

  const hapticVibrate = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.vibrate();
      } catch (e) {
        logger.warn('Haptics vibrate not available', e);
      }
    }
  }, []);

  return {
    hapticImpact,
    hapticSelection,
    hapticVibrate,
  };
}
