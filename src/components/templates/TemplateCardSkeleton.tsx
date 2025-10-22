'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Skeleton } from '@/components/ui/skeleton';

export function TemplateCardSkeleton() {
  return (
    <ModernCard className="h-full">
      <ModernCardContent className="p-0">
        {/* Image Skeleton */}
        <div className="relative aspect-video bg-slate-700 animate-pulse" />

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />

          {/* Description */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />

          {/* Stats */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>

          {/* Author */}
          <Skeleton className="h-4 w-32" />

          {/* Button */}
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}

export function TemplateGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TemplateCardSkeleton key={i} />
      ))}
    </div>
  );
}
