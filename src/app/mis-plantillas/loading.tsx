import { TemplateSkeleton } from '@/components/skeletons/TemplateSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="container mx-auto px-4 py-8 md:py-12">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div>
                        <Skeleton className="h-10 md:h-12 w-64 mb-3 bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-6 w-96 bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Skeleton className="h-12 w-40 bg-gray-200 dark:bg-gray-700" />
                        <Skeleton className="h-12 w-40 bg-gray-200 dark:bg-gray-700" />
                    </div>
                </div>

                {/* Templates Grid Skeleton */}
                <TemplateSkeleton count={6} />
            </div>
        </div>
    );
}
