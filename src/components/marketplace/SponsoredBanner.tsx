'use client';

import Image from 'next/image';
import { Star, ChevronRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';

export function SponsoredBanner() {
  const t = useTranslations('marketplace.sponsored');
  const locale = useLocale();

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 20px -6px rgba(83, 63, 198, 0.15)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative w-full border border-purple-100 dark:border-purple-900/30 bg-white dark:bg-gray-800/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm overflow-hidden mb-6 select-none"
    >
      {/* Invisible link overlay covering the entire banner */}
      <a
        href="https://amzn.to/4fll9SB"
        target="_blank"
        rel="noopener sponsored nofollow"
        className="absolute inset-0 z-10"
        aria-label={t('cubeTitle')}
      />

      {/* Decorative Sparkles & background blobs */}
      <div className="absolute top-0 right-1/4 w-32 h-32 bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-xl pointer-events-none" />

      {/* LEFT SECTION: Badge, Headline, Sparkles */}
      <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left relative z-20 gap-3">
        {/* Recomendado Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E8E6F8] text-[#533FC6] border border-[#533FC6]/15 dark:bg-[#2D2A4A] dark:text-[#A79AFE] dark:border-[#A79AFE]/20 shadow-sm shrink-0">
          <Shield className="h-3 w-3 fill-[#533FC6]/10 dark:fill-[#A79AFE]/10" />
          {t('recomendado')}
        </span>

        {/* Headline with Sparkles and custom underline */}
        <div className="relative mt-1 max-w-[280px] sm:max-w-md">
          {/* Left Sparkle (Sticker Coin) */}
          <span className="absolute -left-6 top-2 text-amber-400 text-lg hidden sm:inline animate-pulse">✦</span>

          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tight">
            {t('teFaltanMuchos')}
          </h2>

          {/* Right Sparkle */}
          <span className="absolute -right-6 bottom-2 text-purple-400 text-sm hidden sm:inline animate-pulse">✦</span>

          {/* Premium underline SVG */}
          <svg className="w-40 sm:w-48 h-2 text-[#533FC6] dark:text-[#A79AFE] mt-1 mx-auto md:mx-0 opacity-80" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6C40 2 120 2 198 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* CENTER SECTION: Interactive rotated box image */}
      <div className="relative w-44 h-36 flex items-center justify-center shrink-0 z-20">
        {/* Purple Circle Background */}
        <div className="absolute w-32 h-32 bg-purple-600/10 dark:bg-purple-500/20 rounded-full scale-110 blur-sm group-hover:scale-125 transition-transform duration-500" />
        
        {/* Main image container */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-36 h-36 filter drop-shadow-xl"
        >
          <Image
            src="/assets/amazon_images/cubo.png"
            alt={t('cubeTitle')}
            fill
            className="object-contain transform rotate-3 group-hover:rotate-6 transition-transform duration-300"
            sizes="150px"
            priority
          />
        </motion.div>
      </div>

      {/* RIGHT SECTION: Badge Icons, Stars & Premium CTA Button */}
      <div className="flex-1 md:flex-none flex flex-col items-center md:items-end gap-3 z-20 w-full md:w-auto">
        {/* Right decorative badge icons (hidden on small screen) */}
        <div className="hidden lg:flex items-center gap-1.5 opacity-80">
          <span className="text-xl">🏆</span>
          <span className="text-xl">🎯</span>
        </div>

        {/* Rating Row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-gray-700 dark:text-gray-200">4.4</span>
          <div className="flex items-center gap-0.5 text-amber-400">
            {Array.from({ length: 4 }).map((_, i) => (
              <Star key={`full-${i}`} className="h-4 w-4 fill-current text-amber-400 stroke-amber-400" />
            ))}
            {/* Half star */}
            <div className="relative h-4 w-4">
              <Star className="absolute inset-0 h-4 w-4 text-gray-200 dark:text-gray-600 stroke-gray-200 dark:stroke-gray-600" />
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className="h-4 w-4 fill-current text-amber-400 stroke-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button className="w-full sm:w-auto bg-[#533FC6] hover:bg-[#4332A6] text-white font-black text-xs sm:text-sm uppercase py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center sm:justify-between gap-2.5 cursor-pointer relative overflow-hidden group-hover:scale-[1.02]">
          <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400 text-yellow-400 shrink-0" />
          <span>{t('completarAlbum')}</span>
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </div>
    </motion.div>
  );
}
