'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Skeleton } from '@/components/ui/skeleton';

export function OwnedCollectionCardSkeleton() {
  return (
    <ModernCard className="bg-white/70 backdrop-blur-sm overflow-hidden ring-1 ring-black/5">
      {/* Header Strip */}
      <div className="h-4 bg-slate-400 animate-pulse" />

      <ModernCardContent className="p-6">
        {/* Collection Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1 pr-2">
            <Skeleton className="h-6 w-3/4 mb-2 bg-gray-300" />
            <Skeleton className="h-4 w-1/2 bg-gray-300" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-16 rounded-full bg-gray-300" />
            <Skeleton className="h-8 w-12 bg-gray-300" />
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-8 space-y-5">
          {/* Progress Bar */}
          <div>
            <Skeleton className="h-4 w-20 mb-3 bg-gray-300" />
            <Skeleton className="h-3 w-full rounded-xl bg-gray-300" />
          </div>

          {/* Stats Pills Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="text-center bg-gray-200/50 border border-gray-300 rounded-lg p-4"
              >
                <Skeleton className="h-5 w-5 mx-auto mb-2 bg-gray-300" />
                <Skeleton className="h-6 w-12 mx-auto mb-1 bg-gray-300" />
                <Skeleton className="h-3 w-16 mx-auto bg-gray-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded-xl bg-gray-300" />
          <Skeleton className="h-9 w-full rounded-xl bg-gray-300" />
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}

export function AvailableCollectionCardSkeleton() {
  return (
    <ModernCard className="bg-white/70 backdrop-blur-sm overflow-hidden border-2 border-dashed border-yellow-200/60 ring-1 ring-black/5 relative">
      {/* Left Accent Rail */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 animate-pulse" />

      {/* Header Strip */}
      <div className="h-4 bg-yellow-400 animate-pulse" />

      <ModernCardContent className="p-6 pl-8">
        {/* Collection Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <Skeleton className="h-6 w-3/4 mb-2 bg-gray-300" />
            <Skeleton className="h-4 w-1/2 bg-gray-300" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full bg-gray-300" />
        </div>

        <Skeleton className="h-16 w-full mb-8 bg-gray-300" />

        {/* Add Button */}
        <Skeleton className="h-9 w-full rounded-xl bg-gray-300" />
      </ModernCardContent>
    </ModernCard>
  );
}

export function CollectionGridSkeleton({
  type = 'owned',
  count = 3,
}: {
  type?: 'owned' | 'available';
  count?: number;
}) {
  const SkeletonCard =
    type === 'owned'
      ? OwnedCollectionCardSkeleton
      : AvailableCollectionCardSkeleton;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
