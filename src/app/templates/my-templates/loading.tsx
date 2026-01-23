import { TemplateCardSkeleton } from '@/components/skeletons/TemplateCardSkeleton';

export default function MyTemplatesLoading() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="container mx-auto px-4 py-8">
                {/* Back link skeleton */}
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse" />

                {/* Header skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <div className="h-10 w-80 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                        <div className="h-5 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>

                {/* Templates Grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TemplateCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}
