'use client';

import { useEffect, useState } from 'react';
import { isNative } from '@/lib/platform';
import { MIN_ANDROID_VERSION_CODE } from '@/config/app-version';

type UpdateState = 'checking' | 'ok' | 'required';

/**
 * Checks whether the installed native app version meets the minimum
 * required version. Only runs on native Android — always returns 'ok'
 * on web and PWA.
 *
 * To force an update: bump MIN_ANDROID_VERSION_CODE in /src/config/app-version.ts
 * and redeploy to Vercel. No new APK needed to change the threshold.
 */
export function useForceUpdate(): UpdateState {
    const [state, setState] = useState<UpdateState>('checking');

    useEffect(() => {
        if (!isNative()) {
            setState('ok');
            return;
        }

        async function check() {
            try {
                const { App } = await import('@capacitor/app');
                const info = await App.getInfo();
                // versionCode is returned as a string by the plugin
                const installedCode = parseInt(info.build, 10);
                setState(installedCode >= MIN_ANDROID_VERSION_CODE ? 'ok' : 'required');
            } catch {
                // If we can't determine version (e.g. plugin missing on old build),
                // default to requiring update to be safe.
                setState('required');
            }
        }

        check();
    }, []);

    return state;
}
