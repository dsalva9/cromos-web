import { Skeleton } from '@/components/ui/skeleton';

interface ListSkeletonProps {
  rows?: number;
}

export function ListSkeleton({ rows = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded border-gray-200 bg-white">
          <Skeleton className="h-12 w-12 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-3 w-2/3 bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

