'use client';

import Image from 'next/image';
import { ExternalLink, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { SponsoredProduct } from '@/lib/marketplace/sponsored-product';

interface SponsoredCardProps {
  product: SponsoredProduct;
}

export function SponsoredCard({ product }: SponsoredCardProps) {
  const t = useTranslations('marketplace.sponsored');
  const locale = useLocale();

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.15)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative h-full flex flex-col bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500/40 dark:to-orange-600/40 p-[1.5px] rounded-2xl overflow-hidden shadow-sm dark:shadow-md transition-colors duration-300"
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
        <div className="relative aspect-square bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-gray-850 dark:to-gray-900/60 overflow-hidden flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full h-full bg-white dark:bg-white/95 rounded-lg flex items-center justify-center p-2 sm:p-3">
            <Image
              src={product.imageUrl}
              alt={t('title')}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-105 p-2 sm:p-3"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>

          {/* Ad / Sponsored Badge */}
          <div className="absolute top-2 left-2 z-20 pointer-events-none">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100/90 text-amber-800 border border-amber-300/50 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-700/60 backdrop-blur-sm shadow-sm">
              {t('badge')}
            </span>
          </div>

          {/* Amazon smile logo at Top-Right */}
          <div className="absolute top-2 right-2 z-20 pointer-events-none bg-white/90 dark:bg-gray-800/95 p-1 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center border border-gray-100 dark:border-gray-700">
            <svg className="h-4.5 w-4.5 text-[#FF9900]" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.813 11.968c.157.083.36.074.5-.05l.005.005a90 90 0 0 1 1.623-1.405c.173-.143.143-.372.006-.563l-.125-.17c-.345-.465-.673-.906-.673-1.791v-3.3l.001-.335c.008-1.265.014-2.421-.933-3.305C10.404.274 9.06 0 8.03 0 6.017 0 3.77.75 3.296 3.24c-.047.264.143.404.316.443l2.054.22c.19-.009.33-.196.366-.387.176-.857.896-1.271 1.703-1.271.435 0 .929.16 1.188.55.264.39.26.91.257 1.376v.432q-.3.033-.621.065c-1.113.114-2.397.246-3.36.67C3.873 5.91 2.94 7.08 2.94 8.798c0 2.2 1.387 3.298 3.168 3.298 1.506 0 2.328-.354 3.489-1.54l.167.246c.274.405.456.675 1.047 1.166ZM6.03 8.431C6.03 6.627 7.647 6.3 9.177 6.3v.57c.001.776.002 1.434-.396 2.133-.336.595-.87.961-1.465.961-.812 0-1.286-.619-1.286-1.533M.435 12.174c2.629 1.603 6.698 4.084 13.183.997.28-.116.475.078.199.431C13.538 13.96 11.312 16 7.57 16 3.832 16 .968 13.446.094 12.386c-.24-.275.036-.4.199-.299z"/>
              <path d="M13.828 11.943c.567-.07 1.468-.027 1.645.204.135.176-.004.966-.233 1.533-.23.563-.572.961-.762 1.115s-.333.094-.23-.137c.105-.23.684-1.663.455-1.963-.213-.278-1.177-.177-1.625-.13l-.09.009q-.142.013-.233.024c-.193.021-.245.027-.274-.032-.074-.209.779-.556 1.347-.623"/>
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="p-2 sm:p-3 flex flex-col flex-1 gap-1 sm:gap-2">
          {/* Best Seller Badge */}
          <div className="flex items-center">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black bg-[#C45500]/10 text-[#C45500] dark:bg-[#FF9900]/25 dark:text-[#ffaa33] border border-[#C45500]/15 dark:border-[#FF9900]/25 shadow-sm uppercase tracking-wider">
              {t('bestSeller')}
            </span>
          </div>

          {/* Title & Tagline */}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 text-xs sm:text-sm group-hover:text-orange-500 dark:group-hover:text-amber-400 transition-colors">
              {t('title')}
            </h3>
            <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
              {t('tagline')}
            </p>
          </div>

          {/* Pricing & Review row */}
          <div className="flex items-center justify-between mt-auto pt-1.5 sm:pt-2 border-t border-gray-100 dark:border-gray-700">
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

          {/* Amazon Orange CTA Button */}
          <div className="mt-1 sm:mt-2 z-20 relative">
            <button className="w-full bg-[#FF9900] hover:bg-[#e68a00] text-white font-black text-[10px] sm:text-xs uppercase py-2 sm:py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-1 sm:gap-1.5">
              <span>{t('cta')}</span>
              <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
