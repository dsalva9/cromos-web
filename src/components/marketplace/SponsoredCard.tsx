'use client';

import Image from 'next/image';
import { ExternalLink, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { SponsoredProduct } from '@/lib/marketplace/sponsored-product';

interface SponsoredCardProps {
  product: SponsoredProduct;
}

export function SponsoredCard({ product }: SponsoredCardProps) {
  const t = useTranslations('marketplace.sponsored');
  const locale = useLocale();

  return (
    <>
      {/* 1. Desktop Layout: Full-image premium banner card */}
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.15)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="hidden md:flex group relative h-full w-full flex-col bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500/40 dark:to-orange-600/40 p-[1.5px] rounded-2xl overflow-hidden shadow-sm dark:shadow-md transition-colors duration-300 cursor-pointer"
      >
        {/* Invisible link overlay covering the card */}
        <a
          href={product.amazonUrl}
          target="_blank"
          rel="noopener sponsored nofollow"
          className="absolute inset-0 z-10"
          aria-label={t('title')}
        />

        <div className="relative w-full h-full flex-1 bg-white dark:bg-gray-800 rounded-[15px] overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={t('title')}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 33vw, 25vw"
            priority
          />
        </div>
      </motion.div>

      {/* 2. Mobile Layout: Structured HTML card that matches the other listing cards in height and style */}
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.15)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="md:hidden group relative h-full w-full flex flex-col bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500/40 dark:to-orange-600/40 p-[1.5px] rounded-2xl overflow-hidden shadow-sm dark:shadow-md transition-colors duration-300"
      >
        {/* Invisible link overlay covering the card */}
        <a
          href={product.amazonUrl}
          target="_blank"
          rel="noopener sponsored nofollow"
          className="absolute inset-0 z-10"
          aria-label={t('title')}
        />

        <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-[15px] overflow-hidden">
          {/* Image Container */}
          <div className="relative aspect-square bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-gray-850 dark:to-gray-900/60 overflow-hidden flex items-center justify-center p-3">
            <div className="relative w-full h-full bg-white dark:bg-white/95 rounded-lg flex items-center justify-center p-2">
              <Image
                src="/assets/ultra-pro-sleeves.png"
                alt={t('title')}
                fill
                className="object-contain transition-transform duration-500 group-hover:scale-105 p-2"
                sizes="(max-width: 640px) 50vw"
              />
            </div>

            {/* Ad / Sponsored Badge */}
            <div className="absolute top-2 left-2 z-20 pointer-events-none">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100/90 text-amber-800 border border-amber-300/50 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-700/60 backdrop-blur-sm shadow-sm">
                {t('badge')}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 flex flex-col flex-1 gap-2">
            {/* Best Seller Badge */}
            <div className="flex items-center">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-[#C45500]/10 text-[#C45500] dark:bg-[#FF9900]/25 dark:text-[#ffaa33] border border-[#C45500]/15 dark:border-[#FF9900]/25 shadow-sm uppercase tracking-wider">
                {t('bestSeller')}
              </span>
            </div>

            {/* Title & Tagline */}
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 text-xs group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors">
                {t('title')}
              </h3>
            </div>

            {/* Pricing & Review row */}
            <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-extrabold text-[#FF9900] dark:text-[#ffaa33] tracking-wide uppercase">
                {t('priceLabel')}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                  {product.rating.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: Math.floor(product.rating) }).map((_, i) => (
                    <Star key={`full-${i}`} className="h-3 w-3 fill-current text-amber-400 stroke-amber-400" />
                  ))}
                  {product.rating % 1 >= 0.4 && product.rating % 1 <= 0.8 && (
                    <div className="relative h-3 w-3">
                      <Star className="absolute inset-0 h-3 w-3 text-gray-200 dark:text-gray-600 stroke-gray-200 dark:stroke-gray-600" />
                      <div className="absolute inset-0 overflow-hidden w-1/2">
                        <Star className="h-3 w-3 fill-current text-amber-400 stroke-amber-400" />
                      </div>
                    </div>
                  )}
                  {Array.from({ length: 5 - Math.floor(product.rating) - (product.rating % 1 >= 0.4 && product.rating % 1 <= 0.8 ? 1 : 0) }).map((_, i) => (
                    <Star key={`empty-${i}`} className="h-3 w-3 text-gray-200 dark:text-gray-600 stroke-gray-200 dark:stroke-gray-600" />
                  ))}
                </div>
              </div>
            </div>

            {/* Amazon Orange CTA Button */}
            <div className="z-20 relative">
              <button className="w-full bg-[#FF9900] hover:bg-[#e68a00] text-white font-black text-[10px] uppercase py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-1">
                <span>{t('cta')}</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
