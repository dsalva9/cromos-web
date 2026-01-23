import { Skeleton } from '@/components/ui/skeleton';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';

export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 md:pb-8">
            {/* Hero Section Skeleton */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="container mx-auto px-4 py-6 md:py-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1 w-full">
                            <Skeleton className="h-10 md:h-12 w-64 md:w-80 mb-3 bg-gray-200 dark:bg-gray-700" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
                                <Skeleton className="h-8 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Skeleton className="h-12 w-32 bg-gray-200 dark:bg-gray-700" />
                            <Skeleton className="h-12 w-32 bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {/* Controls Bar Skeleton */}
                <div className="mb-6">
                    <Skeleton className="h-16 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* Listings Grid Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <ListingCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}
