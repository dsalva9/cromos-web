export default function BuscarLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-9 w-72 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-2" />
          <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="mb-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-4">
          {/* Collection selector */}
          <div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse" />
          </div>
          {/* Search bar */}
          <div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-10 w-full bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse" />
          </div>
          {/* Sort controls */}
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Sort bar skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-md overflow-hidden animate-pulse"
            >
              <div className="p-6">
                {/* User header */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-md" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                    <div className="h-3 w-32 bg-gray-100 dark:bg-gray-600 rounded" />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="h-12 w-full bg-gray-100 dark:bg-gray-700 rounded-md" />
                  <div className="flex justify-center">
                    <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-12 w-full bg-gray-100 dark:bg-gray-700 rounded-md" />
                </div>

                {/* Bottom bar */}
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
