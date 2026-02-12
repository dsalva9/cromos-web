'use client';


import { Check, X, Copy as CopyIcon, Trophy, User, ShoppingBag } from 'lucide-react';
import { useMemo } from 'react';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { useState } from 'react';
import { ImageModal } from '@/components/ui/ImageModal';

interface TemplateCopy {
  copy_id: number;
  template_id: number;
  title: string;
  image_url?: string | null;
  is_active: boolean;
  copied_at: string;
  original_author_nickname: string;
  original_author_id: string;
  completed_slots: number;
  total_slots: number;
}

interface SlotProgress {
  status: 'missing' | 'owned' | 'duplicate';
  count: number;
}

interface TemplateSummaryHeaderProps {
  copy: TemplateCopy;
  progress: SlotProgress[];
  marketplaceCount?: number;
}

export function TemplateSummaryHeader({
  copy,
  progress,
  marketplaceCount = 0,
}: TemplateSummaryHeaderProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const stats = useMemo(() => {
    // Count owned (tengo) - slots with status='owned' OR status='duplicate'
    // If you have duplicates, you still HAVE the cromo (it counts as owned)
    const ownedOnly = progress.filter(s => s.status === 'owned').length;
    const duplicatesSlots = progress.filter(s => s.status === 'duplicate').length;

    // TENGO = slots with 'owned' OR 'duplicate' status
    const tengoCount = ownedOnly + duplicatesSlots;

    // REPES = total count of SPARE cromos (count - 1 for each duplicate slot)
    // For example: slot 212 has count=2 (1 spare) + slot 213 has count=4 (3 spares) = 4 total spares
    const repesCount = progress
      .filter(s => s.status === 'duplicate')
      .reduce((sum, s) => sum + (s.count - 1), 0);

    // Count missing (falta) - these are stickers with 0
    const missing = progress.filter(s => s.status === 'missing').length;

    // For completion percentage, count all owned (tengo count already includes duplicates)
    const ownedForCompletion = tengoCount;

    // Total slots should be the total number of unique stickers in the template
    const totalSlots = progress.length;

    const completionPercentage =
      totalSlots > 0 ? Math.round((ownedForCompletion / totalSlots) * 100) : 0;

    return {
      owned: tengoCount,
      duplicates: repesCount,
      missing,
      completionPercentage,
      ownedForCompletion,
      totalSlots,
    };
  }, [progress]);

  const isComplete = stats.completionPercentage === 100;

  return (
    <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden mb-8 shadow-sm">
      {/* Top Gradient Bar */}
      <div
        className={`h-1.5 w-full ${isComplete
          ? 'bg-gradient-to-r from-green-400 to-emerald-600'
          : 'bg-gradient-to-r from-[#FFC000] to-[#FFD700]'
          }`}
      />

      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start justify-between">

          {/* Left Column: Image, Title & Info */}
          <div className="flex-1 w-full">
            <div className="flex gap-4 md:gap-6 mb-4">
              {/* Template Image */}
              {copy.image_url && (
                <>
                  <div
                    className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 cursor-zoom-in"
                    onClick={() => setImageModalOpen(true)}
                  >
                    <Image
                      src={copy.image_url}
                      alt={copy.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 96px, 128px"
                    />
                  </div>
                  <ImageModal
                    isOpen={imageModalOpen}
                    onClose={() => setImageModalOpen(false)}
                    imageUrl={copy.image_url}
                    alt={copy.title}
                  />
                </>
              )}

              {/* Title & Author */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight uppercase break-words">
                    {copy.title}
                  </h1>
                  {isComplete && (
                    <div className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 p-2 rounded-full flex-shrink-0">
                      <Trophy className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate">
                    por{' '}
                    <Link
                      href={`/users/${copy.original_author_id}`}
                      className="hover:text-[#FFC000] transition-colors underline decoration-dotted underline-offset-2 z-10 relative"
                    >
                      {copy.original_author_nickname}
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3 w-full max-w-xl">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500 dark:text-gray-400">Progreso General</span>
                <span className={isComplete ? "text-green-600 dark:text-green-400" : "text-black dark:text-white"}>
                  {stats.completionPercentage}%
                </span>
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isComplete ? 'bg-green-500' : 'bg-[#FFC000]'
                    }`}
                  style={{ width: `${stats.completionPercentage}%` }}
                >
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {stats.ownedForCompletion} de {stats.totalSlots} cromos conseguidos
              </p>
            </div>
          </div>

          {/* Right Column: Stats Grid */}
          <div className={`grid ${marketplaceCount > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-2 sm:gap-3 w-full md:w-auto`}>
            {/* Owned */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-600 transition-colors group">
              <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-950 rounded-lg mb-1 sm:mb-2 group-hover:bg-green-200 dark:group-hover:bg-green-900 transition-colors">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{stats.owned}</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Tengo</span>
            </div>

            {/* Duplicates */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700 hover:border-[#FFC000] transition-colors group">
              <div className="p-1.5 sm:p-2 bg-[#FFC000]/10 dark:bg-[#FFC000]/20 rounded-lg mb-1 sm:mb-2 group-hover:bg-[#FFC000]/20 dark:group-hover:bg-[#FFC000]/30 transition-colors">
                <CopyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-700 dark:text-yellow-500" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{stats.duplicates}</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Repes</span>
            </div>

            {/* Missing */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-600 transition-colors group">
              <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-950 rounded-lg mb-1 sm:mb-2 group-hover:bg-red-200 dark:group-hover:bg-red-900 transition-colors">
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{stats.missing}</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Faltan</span>
            </div>

            {/* Marketplace Availability */}
            {marketplaceCount > 0 && (
              <Link href={`/marketplace?collection=${copy.copy_id}`} className="block">
                <div className="bg-[#FFC000]/5 dark:bg-[#FFC000]/10 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center border border-[#FFC000]/30 hover:border-[#FFC000] transition-colors group h-full cursor-pointer">
                  <div className="p-1.5 sm:p-2 bg-[#FFC000]/20 dark:bg-[#FFC000]/30 rounded-lg mb-1 sm:mb-2 group-hover:bg-[#FFC000]/30 dark:group-hover:bg-[#FFC000]/40 transition-colors">
                    <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-[#FFC000]" />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1">{marketplaceCount}</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-[#FFC000] tracking-wider">En Venta</span>
                </div>
              </Link>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
