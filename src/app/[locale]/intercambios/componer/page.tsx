'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';
import Link from '@/components/ui/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowLeftRight, MessageSquare } from 'lucide-react';

function ComposerContent() {
  const t = useTranslations('trades.composer');
  const { user, loading } = useUser();
  const searchParams = useSearchParams();

  // Support both old params (userId/collectionId) and new params (partner/template/conversation)
  const partnerId = searchParams.get('partner') || searchParams.get('userId');
  const templateId = searchParams.get('template') || searchParams.get('collectionId');
  const conversationId = searchParams.get('conversation');

  // Where to go back to
  const backHref = conversationId
    ? '/chats?tab=match'
    : '/intercambios';

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  // Missing required params — show generic Coming Soon
  if (!partnerId || !templateId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Link href={backHref}>
            <Button variant="ghost" className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('backToHub')}
            </Button>
          </Link>
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

  // Has params (coming from a match chat) — show Coming Soon with "back to chat"
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href={backHref}>
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {conversationId ? t('backToChat') : t('backToHub')}
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
        </div>

        {/* Coming Soon Card — context-aware */}
        <div className="rounded-2xl border-2 border-black bg-white dark:bg-gray-800 shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20 flex items-center justify-center border-2 border-gold/30">
              <ArrowLeftRight className="h-8 w-8 text-gold" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {t('comingSoon')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            {t('comingSoonComposerDesc')}
          </p>

          {/* Back to chat CTA */}
          {conversationId && (
            <Link href={backHref}>
              <Button className="bg-gold hover:bg-yellow-400 text-black font-bold border-2 border-black gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('backToChat')}
              </Button>
            </Link>
          )}
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
