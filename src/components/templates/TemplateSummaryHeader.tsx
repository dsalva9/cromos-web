'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, Copy as CopyIcon } from 'lucide-react';
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
    // Count owned (tengo) - these are stickers with exactly 1
    const owned = progress.filter(s => s.status === 'owned').length;

    // Count duplicates (repes) - these are stickers with 2 or more
    const duplicates = progress.filter(s => s.status === 'duplicate').length;

    // Count missing (falta) - these are stickers with 0
    const missing = progress.filter(s => s.status === 'missing').length;

    // Calculate the actual counts:
    // tengo: count of stickers with exactly 1
    // repes: count of stickers with 2 or more, but display as (count - 1) spares
    // falta: count of stickers with 0
    const tengoCount = owned;
    const repesCount = duplicates;
    const repesSpareCount = progress
      .filter(s => s.status === 'duplicate')
      .reduce((sum, s) => sum + (s.count - 1), 0);

    // For completion percentage, count tengo + repes as owned
    const ownedForCompletion = tengoCount + repesCount;

    // Total slots should be the total number of unique stickers in the template
    const totalSlots = progress.length;

    const completionPercentage =
      totalSlots > 0 ? Math.round((ownedForCompletion / totalSlots) * 100) : 0;

    return {
      owned: tengoCount,
      duplicates: repesCount,
      missing,
      totalDuplicatesCount: repesSpareCount,
      completionPercentage,
      ownedForCompletion,
      totalSlots,
    };
  }, [progress]);

  return (
    <ModernCard className="mb-6">
      <ModernCardContent className="p-6">
        <div className="space-y-6">
          {/* Title and Active Badge */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">
                {copy.title}
              </h1>
              <p className="text-gray-400 text-sm">
                por {copy.original_author_nickname}
              </p>
            </div>

            <Badge
              className={`
                ${copy.is_active ? 'bg-green-500' : 'bg-gray-500'} 
                text-white uppercase
              `}
            >
              {copy.is_active ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-400">Completado</span>
              <span className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                {stats.completionPercentage}%
              </span>
            </div>
            <Progress
              value={stats.completionPercentage}
              className="h-3 bg-gray-700"
            />
            <p className="text-sm text-gray-400 text-center">
              {stats.ownedForCompletion} / {stats.totalSlots} cromos
            </p>
          </div>

          {/* Stats Pills */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Owned */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-sm uppercase font-bold text-gray-400">
                  Tengo
                </span>
              </div>
              <p className="text-3xl font-black text-white">{stats.owned}</p>
            </div>

            {/* Duplicates */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CopyIcon className="h-5 w-5 text-amber-500" />
                <span className="text-sm uppercase font-bold text-gray-400">
                  Repes
                </span>
              </div>
              <p className="text-3xl font-black text-white">
                {stats.duplicates}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ({stats.totalDuplicatesCount} total)
              </p>
            </div>

            {/* Missing */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <X className="h-5 w-5 text-red-500" />
                <span className="text-sm uppercase font-bold text-gray-400">
                  Faltan
                </span>
              </div>
              <p className="text-3xl font-black text-white">{stats.missing}</p>
            </div>
          </div>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
