'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';
import Link from '@/components/ui/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';

function ComposerContent() {
  const t = useTranslations('trades.composer');
  const { user, loading } = useUser();
  const searchParams = useSearchParams();

  const userId = searchParams.get('userId');
  const collectionId = searchParams.get('collectionId');

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  // Missing required params
  if (!userId || !collectionId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Link href="/intercambios">
            <Button variant="ghost" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('backToHub')}
            </Button>
          </Link>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {t('missingParams')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back button */}
        <Link href="/intercambios">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('backToHub')}
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
        </div>

        {/* Coming Soon Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20 flex items-center justify-center border-2 border-gold/30">
              <ArrowLeftRight className="h-8 w-8 text-gold" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {t('comingSoon')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {t('comingSoonDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ComposerPage() {
  return (
    <AuthGuard>
      <ComposerContent />
    </AuthGuard>
  );
}
