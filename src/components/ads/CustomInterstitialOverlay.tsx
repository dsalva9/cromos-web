'use client';

import { useEffect, useState, useRef, useCallback, type MouseEvent } from 'react';
import { Star, X, ExternalLink, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AffiliateLink } from '@/types/affiliates';
import { recordAffiliateEvent } from '@/lib/marketplace/interstitialAffiliate';

interface CustomInterstitialOverlayProps {
  affiliate: AffiliateLink;
  onClose: () => void;
  countdownSeconds?: number;
}

export function CustomInterstitialOverlay({
  affiliate,
  onClose,
  countdownSeconds = 5,
}: CustomInterstitialOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const [isClosing, setIsClosing] = useState(false);
  const impressionRecordedRef = useRef(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Record impression once on mount
  useEffect(() => {
    if (!impressionRecordedRef.current && affiliate?.id) {
      impressionRecordedRef.current = true;
      recordAffiliateEvent(affiliate.id, 'impression');
    }
  }, [affiliate?.id]);

  // Lock body scroll while open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // 5-second countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) {
      closeBtnRef.current?.focus();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const triggerClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  }, [onClose]);

  // Close on browser back button (popstate) or Escape (only after countdown)
  useEffect(() => {
    const handlePopState = () => {
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && secondsLeft <= 0) {
        e.preventDefault();
        recordAffiliateEvent(affiliate.id, 'dismiss');
        triggerClose();
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [affiliate.id, onClose, secondsLeft, triggerClose]);

  // Clicking the X button closes without opening the affiliate link
  const handleDismissClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (secondsLeft > 0) return;
    recordAffiliateEvent(affiliate.id, 'dismiss');
    triggerClose();
  };

  // Clicking anywhere else (dead zones or card) opens affiliate link and closes overlay
  const handleAffiliateClick = () => {
    recordAffiliateEvent(affiliate.id, 'click');
    window.open(affiliate.destination_url, '_blank', 'noopener,noreferrer');
    triggerClose();
  };

  const mobileConfig = affiliate.image_config?.mobile || { scale: 1, x: 0, y: 0 };
  const desktopConfig = affiliate.image_config?.desktop || { scale: 1, x: 0, y: 0 };
  const ratingValue = Number(affiliate.rating) || 5.0;

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < Math.round(rating);
          return (
            <Star
              key={i}
              className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${
                filled
                  ? 'fill-amber-400 text-amber-400 stroke-amber-400'
                  : 'text-gray-300 dark:text-gray-600 stroke-gray-300 dark:stroke-gray-600'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Anuncio patrocinado: ${affiliate.title}`}
          tabIndex={-1}
          data-testid="custom-interstitial-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleAffiliateClick}
          className="fixed inset-0 z-[var(--z-interstitial,10000)] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 cursor-pointer select-none overflow-hidden"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Ambient glow in the darkened dead zones */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-amber-500/15 rounded-full blur-2xl" />
          </div>

          {/* Main Interstitial Card / Poster */}
          <motion.div
            data-testid="custom-interstitial-card"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative w-full max-w-[380px] sm:max-w-[440px] max-h-[90dvh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl border-2 border-white/20 dark:border-gray-700 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden"
          >
            {/* Top Bar: Patrocinado Pill + Countdown / Close Button */}
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#E8E6F8]/95 text-[#533FC6] border border-[#533FC6]/20 shadow-md backdrop-blur-xs">
                <Shield className="h-3 w-3 fill-[#533FC6]/15" />
                Recomendado · Patrocinado
              </span>

              {/* Countdown / Close Button */}
              <div
                aria-live="polite"
                className="pointer-events-auto"
              >
                {secondsLeft > 0 ? (
                  <div
                    data-testid="interstitial-countdown"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center min-w-[38px] h-[38px] px-2.5 rounded-full bg-gray-900/85 text-white font-black text-xs sm:text-sm border border-white/25 shadow-lg backdrop-blur-md cursor-default"
                    title={`Podrás cerrar en ${secondsLeft}s`}
                  >
                    <span>{secondsLeft}s</span>
                  </div>
                ) : (
                  <button
                    ref={closeBtnRef}
                    type="button"
                    data-testid="interstitial-close-btn"
                    aria-label="Cerrar anuncio"
                    onClick={handleDismissClick}
                    className="flex items-center justify-center w-[38px] h-[38px] rounded-full bg-gray-900/90 hover:bg-black text-white border-2 border-white/40 shadow-xl transition-transform duration-150 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <X className="h-5 w-5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* Hero Image Section (scales responsively on mobile & desktop) */}
            <div className="relative w-full h-[220px] min-[380px]:h-[250px] sm:h-[290px] bg-gradient-to-b from-purple-50/70 via-white to-amber-50/40 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6 pt-14 overflow-hidden border-b border-gray-100 dark:border-gray-800 shrink-0">
              {/* Mobile viewport image transform */}
              <div className="w-full h-full flex items-center justify-center md:hidden">
                <img
                  src={affiliate.image_url}
                  alt={affiliate.title}
                  draggable={false}
                  className="max-w-full max-h-full object-contain transition-transform duration-300"
                  style={{
                    transform: `translate(${mobileConfig.x}px, ${mobileConfig.y}px) scale(${mobileConfig.scale})`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>

              {/* Desktop viewport image transform */}
              <div className="w-full h-full hidden md:flex items-center justify-center">
                <img
                  src={affiliate.image_url}
                  alt={affiliate.title}
                  draggable={false}
                  className="max-w-full max-h-full object-contain transition-transform duration-300"
                  style={{
                    transform: `translate(${desktopConfig.x}px, ${desktopConfig.y}px) scale(${desktopConfig.scale})`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            </div>

            {/* Content & CTA Section */}
            <div className="p-4 sm:p-6 flex flex-col gap-3 bg-white dark:bg-gray-900">
              {/* Rating & Best Seller row */}
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-[#FF9900]/15 text-[#C45500] dark:bg-[#FF9900]/25 dark:text-[#ffaa33] border border-[#C45500]/20 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  Destacado Amazon
                </span>

                <div className="flex items-center gap-1.5">
                  {renderStars(ratingValue)}
                  <span className="text-xs sm:text-sm font-black text-gray-800 dark:text-gray-200">
                    {ratingValue.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase leading-tight tracking-tight line-clamp-2">
                  {affiliate.title}
                </h2>
                {affiliate.subtitle && (
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 line-clamp-2">
                    {affiliate.subtitle}
                  </p>
                )}
              </div>

              {/* Primary CTA Button */}
              <div className="mt-1 w-full bg-[#533FC6] hover:bg-[#4332A6] text-white font-black text-xs sm:text-sm uppercase py-3.5 px-5 rounded-2xl shadow-lg shadow-[#533FC6]/25 flex items-center justify-center gap-2 transition-all duration-200">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />
                <span className="truncate">{affiliate.cta_text || 'Ver oferta en Amazon'}</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </div>

              <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 font-medium">
                Haz clic en cualquier parte para abrir la oferta
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
