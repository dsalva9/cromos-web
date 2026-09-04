'use client';
import { useState, useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
import { isNative } from '@/lib/platform';

// Register the Device plugin directly via Capacitor bridge to avoid dynamic import hangs.
let DevicePlugin: any = null;

function getDevicePlugin() {
  if (DevicePlugin) return DevicePlugin;
  try {
    DevicePlugin = registerPlugin('Device');
    return DevicePlugin;
  } catch (err) {
    return null;
  }
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadDeviceId() {
      try {
        if (isNative()) {
          const Device = getDevicePlugin();
          if (Device) {
            const info = await Device.getId();
            if (mounted) {
              setDeviceId(info.identifier || info.uuid || null);
            }
          } else {
            if (mounted) setDeviceId(null);
          }
        } else {
          // Web fallback
          const stored = localStorage.getItem('cc_device_id');
          if (stored) {
            if (mounted) setDeviceId(stored);
          } else {
            const newId = crypto.randomUUID();
            localStorage.setItem('cc_device_id', newId);
            if (mounted) setDeviceId(newId);
          }
        }
      } catch (err) {
        if (mounted) setDeviceId(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDeviceId();

    return () => {
      mounted = false;
    };
  }, []);

  return { deviceId, loading };
}
