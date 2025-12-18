import { Skeleton } from '@/components/ui/skeleton';

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3 bg-white border-gray-200">
          <Skeleton className="h-48 w-full bg-gray-200" />
          <Skeleton className="h-4 w-3/4 bg-gray-200" />
          <Skeleton className="h-4 w-1/2 bg-gray-200" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 bg-gray-200" />
            <Skeleton className="h-8 w-24 bg-gray-200" />
          </div>
        </div>
      ))}
    </>
  );
}

