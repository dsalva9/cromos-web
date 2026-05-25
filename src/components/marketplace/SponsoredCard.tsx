'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { SponsoredProduct } from '@/lib/marketplace/sponsored-product';

interface SponsoredCardProps {
  product: SponsoredProduct;
}

export function SponsoredCard({ product }: SponsoredCardProps) {
  const t = useTranslations('marketplace.sponsored');

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.15)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative h-fit self-start w-full flex flex-col bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500/40 dark:to-orange-600/40 p-[1.5px] rounded-2xl overflow-hidden shadow-sm dark:shadow-md transition-colors duration-300 aspect-[681/1024] cursor-pointer"
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
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority
        />
      </div>
    </motion.div>
  );
}
