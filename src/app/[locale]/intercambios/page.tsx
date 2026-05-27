'use client';

import { useTranslations } from 'next-intl';
import { ArrowLeftRight, Inbox, Send } from 'lucide-react';
import { useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';

function IntercambiosContent() {
  const t = useTranslations('trades.hub');
  const { user, loading } = useUser();

  // Show spinner while auth is resolving or when not authenticated
  // (AuthGuard handles the redirect, but we avoid flashing page content)
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('desc')}
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20 flex items-center justify-center border-2 border-gold/30">
                <ArrowLeftRight className="h-10 w-10 text-gold" />
              </div>
              {/* Decorative orbiting icons */}
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-700">
                <Inbox className="h-4 w-4 text-blue-500" />
              </div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center border border-green-200 dark:border-green-700">
                <Send className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {t('comingSoonTitle')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t('comingSoon')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function IntercambiosPage() {
  return (
    <AuthGuard>
      <IntercambiosContent />
    </AuthGuard>
  );
}
