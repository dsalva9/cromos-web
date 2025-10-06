'use client';

import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';

export function ProfileLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="text-center mb-12">
          <div className="h-12 w-64 bg-white/20 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-96 bg-white/10 rounded mx-auto animate-pulse" />
        </div>

        {/* Profile Header Skeleton */}
        <div className="mb-12">
          <ModernCard className="bg-white/70 backdrop-blur-sm overflow-hidden">
            <div className="h-4 bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse" />
            <ModernCardContent className="p-8">
              <div className="flex items-center space-x-8">
                <div className="w-28 h-28 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-4">
                  <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-80 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Collections Grid Skeleton */}
        <div className="space-y-12">
          {/* Owned Collections Skeleton */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <div className="h-10 w-48 bg-white/20 rounded animate-pulse" />
              <div className="h-8 w-24 bg-white/20 rounded-full animate-pulse" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <ModernCard key={i} className="bg-white/70 backdrop-blur-sm">
                  <div className="h-4 bg-gray-300 animate-pulse" />
                  <ModernCardContent className="p-6 space-y-4">
                    <div className="h-6 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-9 bg-gray-200 rounded-xl animate-pulse" />
                      <div className="h-9 bg-gray-200 rounded-xl animate-pulse" />
                    </div>
                  </ModernCardContent>
                </ModernCard>
              ))}
            </div>
          </div>

          {/* Available Collections Skeleton */}
          <div>
            <div className="flex justify-between items-center mb-8">
              <div className="h-10 w-56 bg-white/20 rounded animate-pulse" />
              <div className="h-8 w-28 bg-white/20 rounded-full animate-pulse" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map(i => (
                <ModernCard
                  key={i}
                  className="bg-white/70 backdrop-blur-sm border-2 border-dashed border-yellow-200/60"
                >
                  <div className="h-4 bg-yellow-400 animate-pulse" />
                  <ModernCardContent className="p-6 space-y-4">
                    <div className="h-6 w-full bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-16 bg-gray-100 rounded animate-pulse" />
                    <div className="h-9 bg-gray-200 rounded-xl animate-pulse" />
                  </ModernCardContent>
                </ModernCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

