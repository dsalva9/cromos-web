'use client';

import Image from 'next/image';
import { Star, ChevronRight, Shield } from 'lucide-react';
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
    <motion.a
      href={product.amazonUrl}
      target="_blank"
      rel="noopener sponsored nofollow"
      aria-label={t(product.titleKey as any)}
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.15)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group block relative h-full w-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-700/50 shadow-sm dark:shadow-md transition-colors duration-300 cursor-pointer"
    >

      {/* Image Container: aspect-square matches the aspect ratio of regular card listing images */}
      <div className="relative aspect-square bg-gradient-to-br from-amber-50/10 to-orange-50/10 dark:from-gray-800/20 dark:to-gray-900/20 overflow-hidden flex items-center justify-center p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="relative w-full h-full bg-white dark:bg-white rounded-xl flex items-center justify-center p-1">
          <Image
            src={product.imageUrl}
            alt={t(product.titleKey as any)}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105 p-1"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority
          />
        </div>

        {/* Recomendado Badge Overlay */}
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-[#E8E6F8] text-[#533FC6] border border-[#533FC6]/15 dark:bg-[#2D2A4A] dark:text-[#A79AFE] dark:border-[#A79AFE]/20 shadow-sm">
            <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-[#533FC6]/10 dark:fill-[#A79AFE]/10" />
            {t('recomendado')}
          </span>
        </div>

        {/* Patrocinado Badge Overlay: Hidden on mobile, shown on desktop */}
        <div className="absolute top-2 right-2 z-20 pointer-events-none hidden md:block">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40 uppercase tracking-wider">
            {t('badge')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        {/* Best Seller Badge */}
        <div className="flex items-center">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black bg-[#C45500]/10 text-[#C45500] dark:bg-[#FF9900]/25 dark:text-[#ffaa33] border border-[#C45500]/15 dark:border-[#FF9900]/25 shadow-sm uppercase tracking-wider">
            {t('bestSeller')}
          </span>
        </div>

        {/* Title & Tagline: Hidden on mobile, visible on desktop */}
        <div className="hidden md:block min-h-[2.5rem] sm:min-h-[3rem]">
          <h3 className="font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 text-xs sm:text-sm group-hover:text-primary transition-colors">
            {t(product.titleKey as any)}
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
            {t(product.taglineKey as any)}
          </p>
        </div>

        {/* Pricing & Review row */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-[10px] sm:text-[11px] font-extrabold text-[#FF9900] dark:text-[#ffaa33] tracking-wide uppercase">
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

        {/* Premium CTA Button */}
        <div className="hidden md:block mt-2 z-20 relative">
          <div className="w-full bg-[#533FC6] group-hover:bg-[#4332A6] text-white font-black text-[10px] sm:text-xs uppercase py-2.5 rounded-xl transition-all duration-200 shadow-sm flex items-center justify-between px-3 sm:px-3.5 gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-yellow-400 stroke-yellow-400 text-yellow-400" />
              <span>{t(product.ctaKey as any)}</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
      </div>
    </motion.a>
  );
}

