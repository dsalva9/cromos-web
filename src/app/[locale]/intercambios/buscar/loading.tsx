export default function BuscarLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-2" />
              <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
              <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            </div>
          </div>
          {/* Collection bar skeleton */}
          <div className="mt-4">
            <div className="h-10 w-full sm:w-80 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Card skeleton (spotlight) */}
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 280px)' }}>
          <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
              <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            </div>

            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden animate-pulse">
              {/* Gold header skeleton */}
              <div className="h-20 bg-gray-200 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-700" />

              <div className="p-6">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
                  <div className="h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded-md mb-2" />
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-4">
                  <div className="h-12 w-full bg-gray-100 dark:bg-gray-700 rounded-md" />
                  <div className="h-12 w-full bg-gray-100 dark:bg-gray-700 rounded-md" />
                </div>

                {/* Sticker preview toggle */}
                <div className="h-8 w-full bg-gray-100 dark:bg-gray-700 rounded-md mb-2" />

                {/* Detail link */}
                <div className="h-8 w-32 bg-gray-100 dark:bg-gray-700 rounded-md mx-auto" />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 border-t-2 border-gray-200 dark:border-gray-700">
                <div className="h-14 bg-gray-100 dark:bg-gray-700 border-r-2 border-gray-200 dark:border-gray-700" />
                <div className="h-14 bg-gray-200 dark:bg-gray-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
