'use client';

import Image from 'next/image';
import { Star, ChevronRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';

export function SponsoredBanner() {
  const t = useTranslations('marketplace.sponsored');
  const locale = useLocale();

  // Helper to render rating stars
  const renderStars = (rating: number, sizeClass = "h-3.5 w-3.5") => {
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 4 }).map((_, i) => (
          <Star key={`full-${i}`} className={`${sizeClass} fill-current text-amber-400 stroke-amber-400`} />
        ))}
        {/* 0.4 half star */}
        <div className="relative w-3.5 h-3.5">
          <Star className={`absolute inset-0 ${sizeClass} text-gray-200 dark:text-gray-600 stroke-gray-200 dark:stroke-gray-600`} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={`${sizeClass} fill-current text-amber-400 stroke-amber-400`} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      whileHover={{ y: -1, boxShadow: '0 6px 15px -5px rgba(83, 63, 198, 0.12)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="group relative w-full border border-purple-100 dark:border-purple-900/30 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm overflow-hidden mb-6 select-none"
    >
      {/* Invisible link overlay covering the entire banner */}
      <a
        href="https://amzn.to/4fll9SB"
        target="_blank"
        rel="noopener sponsored nofollow"
        className="absolute inset-0 z-10"
        aria-label={t('cubeTitle')}
      />

      {/* Background soft glowing blur */}
      <div className="absolute top-0 right-1/4 w-24 h-24 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-xl pointer-events-none" />

      {/* ==================== MOBILE LAYOUT (< 640px) ==================== */}
      <div className="block sm:hidden relative z-20">
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Left Column: Badge + Text */}
          <div className="col-span-8 flex flex-col items-start gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-[#E8E6F8] text-[#533FC6] border border-[#533FC6]/15 dark:bg-[#2D2A4A] dark:text-[#A79AFE] dark:border-[#A79AFE]/20">
              <Shield className="h-2 w-2 fill-[#533FC6]/10" />
              {t('recomendado')}
            </span>
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight tracking-tight">
              {t('teFaltanMuchos')}
            </h2>
          </div>

          {/* Right Column: Rotated Image with glowing backdrop */}
          <div className="col-span-4 flex justify-end relative h-16 w-full pr-1">
            <div className="absolute w-12 h-12 bg-purple-600/10 rounded-full blur-xs top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <div className="relative w-16 h-16">
              <Image
                src="/assets/amazon_images/cubo.png"
                alt={t('cubeTitle')}
                fill
                className="object-contain transform rotate-3"
                sizes="80px"
                priority
              />
            </div>
          </div>

          {/* Bottom Row: Rating on left, CTA on right */}
          <div className="col-span-12 flex items-center justify-between pt-2.5 mt-1.5 border-t border-gray-100 dark:border-gray-700/50">
            {/* Rating */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-gray-700 dark:text-gray-200">4.4</span>
              {renderStars(4.4, "h-3 w-3")}
            </div>

            {/* CTA Button */}
            <button className="bg-[#533FC6] text-white font-black text-[9px] uppercase py-2 px-3 rounded-lg flex items-center gap-1 shadow-sm shrink-0">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{t('completarAlbum')}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== DESKTOP LAYOUT (>= 640px) ==================== */}
      <div className="hidden sm:flex items-center justify-between w-full gap-4 relative z-20">
        {/* Left Section: Badge + Text with Underline */}
        <div className="flex-1 min-w-0 flex flex-col items-start gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E8E6F8] text-[#533FC6] border border-[#533FC6]/15 dark:bg-[#2D2A4A] dark:text-[#A79AFE] dark:border-[#A79AFE]/20">
            <Shield className="h-2.5 w-2.5 fill-[#533FC6]/10 dark:fill-[#A79AFE]/10" />
            {t('recomendado')}
          </span>
          <div className="relative mt-0.5">
            <h2 className="text-base font-black text-gray-900 dark:text-white uppercase leading-tight tracking-tight">
              {t('teFaltanMuchos')}
            </h2>
            {/* Underline SVG */}
            <svg className="w-36 h-1.5 text-[#533FC6] dark:text-[#A79AFE] mt-0.5 opacity-80" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6C40 2 120 2 198 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Center Section: Compact rotated image */}
        <div className="relative w-24 h-20 flex items-center justify-center shrink-0">
          <div className="absolute w-16 h-16 bg-purple-600/10 dark:bg-purple-500/20 rounded-full blur-xs group-hover:scale-110 transition-transform duration-500" />
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-20 h-20"
          >
            <Image
              src="/assets/amazon_images/cubo.png"
              alt={t('cubeTitle')}
              fill
              className="object-contain transform rotate-3 group-hover:rotate-6 transition-transform duration-300"
              sizes="100px"
              priority
            />
          </motion.div>
        </div>

        {/* Right Section: Rating + Star Button */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Rating */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-gray-700 dark:text-gray-200">4.4</span>
            {renderStars(4.4, "h-3.5 w-3.5")}
          </div>

          {/* CTA Button */}
          <button className="bg-[#533FC6] hover:bg-[#4332A6] text-white font-black text-[10px] uppercase py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all duration-200 shadow-sm hover:scale-[1.02] shrink-0">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
            <span>{t('completarAlbum')}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
