import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { useCallback } from 'react';

export function useHaptic() {
  const hapticImpact = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Switch to simple vibrate for better compatibility on Samsung devices
        await Haptics.vibrate({ duration: 10 });
      } catch (e) {
        console.warn('Haptics error', e);
      }
    } else {
      console.log('Haptics skipped: Not native platform');
    }
  }, []);

  const hapticSelection = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
      } catch (e) {
        console.warn('Haptics selection not available', e);
      }
    }
  }, []);

  const hapticVibrate = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.vibrate();
      } catch (e) {
        console.warn('Haptics vibrate not available', e);
      }
    }
  }, []);

  return {
    hapticImpact,
    hapticSelection,
    hapticVibrate,
  };
}
