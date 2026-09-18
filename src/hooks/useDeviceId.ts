'use client';
import { useState, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { isNative } from '@/lib/platform';
import { safeStorage } from '@/lib/safeStorage';

let PreferencesPlugin: any = null;
function getPreferencesPlugin() {
  if (PreferencesPlugin) return PreferencesPlugin;
  try {
    PreferencesPlugin = registerPlugin('Preferences');
    return PreferencesPlugin;
  } catch {
    return null;
  }
}

function generateFallbackId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(() => {
    return safeStorage.getItem('cc_device_id');
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function resolveDeviceId() {
      try {
        // 1. Try native Preferences (SharedPreferences on Android)
        if (isNative()) {
          const Prefs = getPreferencesPlugin();
          if (Prefs) {
            try {
              const res = await Prefs.get({ key: 'cc_device_id' });
              if (res?.value) {
                if (mounted) setDeviceId(res.value);
                safeStorage.setItem('cc_device_id', res.value);
                return;
              }
            } catch {
              // fallback to localStorage
            }
          }
        }

        // 2. Try localStorage
        const existingId = safeStorage.getItem('cc_device_id');

        if (existingId) {
          if (mounted) setDeviceId(existingId);
          if (isNative()) {
            const Prefs = getPreferencesPlugin();
            try { await Prefs?.set({ key: 'cc_device_id', value: existingId }); } catch {}
          }
          return;
        }

        // 3. Generate new stable ID
        const newId = generateFallbackId();
        safeStorage.setItem('cc_device_id', newId);
        if (isNative()) {
          const Prefs = getPreferencesPlugin();
          try { await Prefs?.set({ key: 'cc_device_id', value: newId }); } catch {}
        }

        if (mounted) setDeviceId(newId);
      } catch {
        const fallback = generateFallbackId();
        if (mounted) setDeviceId(fallback);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    resolveDeviceId();

    return () => {
      mounted = false;
    };
  }, []);

  return { deviceId, loading };
}
