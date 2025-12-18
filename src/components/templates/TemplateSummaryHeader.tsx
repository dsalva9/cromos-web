'use client';


import { Check, X, Copy as CopyIcon, Trophy, User } from 'lucide-react';
import { useMemo } from 'react';

interface TemplateCopy {
  copy_id: string;
  template_id: string;
  title: string;
  is_active: boolean;
  copied_at: string;
  original_author_nickname: string;
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
}

export function TemplateSummaryHeader({
  copy,
  progress,
}: TemplateSummaryHeaderProps) {
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
    <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
      {/* Top Gradient Bar */}
      <div
        className={`h-1.5 w-full ${isComplete
            ? 'bg-gradient-to-r from-green-400 to-emerald-600'
            : 'bg-gradient-to-r from-[#FFC000] to-[#FFD700]'
          }`}
      />

      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start justify-between">

          {/* Left Column: Title & Info */}
          <div className="flex-1 space-y-4 w-full">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight uppercase">
                  {copy.title}
                </h1>
                {isComplete && (
                  <div className="bg-green-100 text-green-700 p-2 rounded-full">
                    <Trophy className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <User className="w-4 h-4" />
                <span className="text-sm">por {copy.original_author_nickname}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3 max-w-xl">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-gray-500">Progreso General</span>
                <span className={isComplete ? "text-green-600" : "text-black"}>
                  {stats.completionPercentage}%
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden ring-1 ring-black/5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isComplete ? 'bg-green-500' : 'bg-[#FFC000]'
                    }`}
                  style={{ width: `${stats.completionPercentage}%` }}
                >
                </div>
              </div>
              <p className="text-xs text-gray-500 font-mono">
                {stats.ownedForCompletion} de {stats.totalSlots} cromos conseguidos
              </p>
            </div>
          </div>

          {/* Right Column: Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto">
            {/* Owned */}
            <div className="bg-gray-50 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center border border-gray-100 hover:border-green-200 transition-colors group">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg mb-1 sm:mb-2 group-hover:bg-green-200 transition-colors">
                <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.owned}</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 tracking-wider">Tengo</span>
            </div>

            {/* Duplicates */}
            <div className="bg-gray-50 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center border border-gray-100 hover:border-[#FFC000] transition-colors group">
              <div className="p-1.5 sm:p-2 bg-[#FFC000]/10 rounded-lg mb-1 sm:mb-2 group-hover:bg-[#FFC000]/20 transition-colors">
                <CopyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-700" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.duplicates}</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 tracking-wider">Repes</span>
            </div>

            {/* Missing */}
            <div className="bg-gray-50 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center border border-gray-100 hover:border-red-200 transition-colors group">
              <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg mb-1 sm:mb-2 group-hover:bg-red-200 transition-colors">
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats.missing}</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 tracking-wider">Faltan</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
