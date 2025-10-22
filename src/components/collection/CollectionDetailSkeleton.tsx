'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Skeleton } from '@/components/ui/skeleton';

export function CollectionDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Header Skeleton */}
      <ModernCard>
        <ModernCardContent className="p-6">
          <div className="space-y-6">
            {/* Title and Badge */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-20" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>

            {/* Stats Pills */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="bg-slate-800/30 border-2 border-slate-700 rounded-lg p-4"
                >
                  <Skeleton className="h-6 w-20 mx-auto mb-2" />
                  <Skeleton className="h-9 w-16 mx-auto mb-2" />
                </div>
              ))}
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Cromos Grid Skeleton */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] bg-slate-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
