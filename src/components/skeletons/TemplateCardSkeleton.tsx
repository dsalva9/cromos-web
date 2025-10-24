import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Skeleton } from '@/components/ui/skeleton';

export function TemplateCardSkeleton() {
  return (
    <ModernCard>
      <ModernCardContent className="p-0">
        {/* Image */}
        <Skeleton className="aspect-video w-full" />

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <Skeleton className="h-6 w-4/5" />

          {/* Description */}
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />

          {/* Stats */}
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Author */}
          <Skeleton className="h-4 w-32" />

          {/* Button */}
          <Skeleton className="h-9 w-full mt-3" />
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
