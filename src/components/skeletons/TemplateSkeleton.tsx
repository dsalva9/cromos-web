import { Skeleton } from '@/components/ui/skeleton';

export function TemplateSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg overflow-hidden bg-white border-gray-200">
          <Skeleton className="h-40 w-full bg-gray-200" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-5 w-3/4 bg-gray-200" />
            <Skeleton className="h-4 w-2/3 bg-gray-200" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20 bg-gray-200" />
              <Skeleton className="h-8 w-20 bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

