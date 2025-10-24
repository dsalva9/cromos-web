import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Skeleton } from '@/components/ui/skeleton';

export function ListingCardSkeleton() {
  return (
    <ModernCard>
      <ModernCardContent className="p-0">
        {/* Image Skeleton */}
        <Skeleton className="aspect-square w-full" />

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <Skeleton className="h-6 w-3/4" />

          {/* Collection */}
          <Skeleton className="h-4 w-1/2" />

          {/* Author */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>

          {/* Date */}
          <Skeleton className="h-3 w-20" />
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
