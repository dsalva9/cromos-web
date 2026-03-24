'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { requestPushPermission } from '@/components/providers/OneSignalProvider';

const DISMISSED_KEY = 'cc-notif-dismissed';
const PROMPT_DELAY_MS = 45_000; // 45 seconds

/**
 * Custom branded banner that replaces OneSignal's default blue slidedown.
 * - Appears 45 s after mount (web only, not native)
 * - Skips if already granted or previously dismissed
 * - Stores dismissal in localStorage so it never returns once closed
 */
export function NotificationPromptBanner() {
  const [visible, setVisible] = useState(false);

  // Should we even consider showing the banner?
  const shouldShow = useCallback(() => {
    if (typeof window === 'undefined') return false;
    // Only web — native uses its own OS-level prompt
    if (Capacitor.isNativePlatform()) return false;
    // Already dismissed
    if (localStorage.getItem(DISMISSED_KEY) === '1') return false;
    // Browser doesn't support notifications
    if (!('Notification' in window)) return false;
    // Already granted — no need to prompt
    if (Notification.permission === 'granted') return false;
    // Permanently denied — banner would be useless
    if (Notification.permission === 'denied') return false;
    return true;
  }, []);

  useEffect(() => {
    if (!shouldShow()) return;

    const timer = setTimeout(() => setVisible(true), PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  }, []);

  const activate = useCallback(() => {
    requestPushPermission();
    dismiss();
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="notification-prompt-banner"
    >
      {/* Bell icon */}
      <span className="notification-prompt-banner__icon" aria-hidden="true">
        🔔
      </span>

      <p className="notification-prompt-banner__text">
        Activa las notificaciones para no perderte mensajes ni ofertas de intercambio.
      </p>

      <div className="notification-prompt-banner__actions">
        <button
          type="button"
          onClick={activate}
          className="notification-prompt-banner__cta"
        >
          Activar
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="notification-prompt-banner__dismiss"
          aria-label="Cerrar aviso de notificaciones"
        >
          ✕
        </button>
      </div>

      {/* Scoped styles — small enough to inline, avoids adding a new CSS file */}
      <style jsx>{`
        .notification-prompt-banner {
          position: fixed;
          bottom: calc(env(safe-area-inset-bottom, 0px) + 80px); /* above MobileBottomNav */
          left: 50%;
          transform: translateX(-50%);
          z-index: 9998;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: calc(100% - 2rem);
          max-width: 420px;
          padding: 0.875rem 1rem;
          background: var(--gold);
          color: #1a1a1a;
          border-radius: 0.75rem;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
          font-size: 0.875rem;
          line-height: 1.35;
          animation: slideUp 0.35s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(1.5rem);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .notification-prompt-banner__icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .notification-prompt-banner__text {
          flex: 1;
          margin: 0;
        }

        .notification-prompt-banner__actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .notification-prompt-banner__cta {
          padding: 0.375rem 0.875rem;
          background: #1a1a1a;
          color: var(--gold);
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.15s;
        }
        .notification-prompt-banner__cta:hover {
          opacity: 0.85;
        }

        .notification-prompt-banner__dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem;
          height: 1.75rem;
          background: transparent;
          border: none;
          color: #1a1a1a;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 50%;
          transition: background 0.15s;
        }
        .notification-prompt-banner__dismiss:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        /* On desktop (no bottom nav), sit at the true bottom */
        @media (min-width: 768px) {
          .notification-prompt-banner {
            bottom: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
