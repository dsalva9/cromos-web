import { TemplateCardSkeleton } from '@/components/skeletons/TemplateCardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <Skeleton className="h-10 w-64 mb-2 bg-gray-200 dark:bg-gray-800" />
                        <Skeleton className="h-6 w-96 bg-gray-200 dark:bg-gray-800" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Skeleton className="h-10 w-32 bg-gray-200 dark:bg-gray-800" />
                        <Skeleton className="h-10 w-40 bg-gray-200 dark:bg-gray-800" />
                    </div>
                </div>

                {/* Filters Skeleton */}
                <div className="mb-8">
                    <Skeleton className="h-14 w-full rounded-xl bg-gray-200 dark:bg-gray-800" />
                </div>

                {/* Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TemplateCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}
