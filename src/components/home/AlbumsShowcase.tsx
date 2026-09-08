'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';
import { Button } from '@/components/ui/button';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { useTemplates } from '@/hooks/templates/useTemplates';
import { AlertCircle } from 'lucide-react';
import { AnimatedList } from '@/components/ui/AnimatedList';

export default function AlbumsShowcase() {
  const t = useTranslations('landing.albumsShowcase');
  const { templates, loading, error } = useTemplates({ sortBy: 'popular', limit: 6 });
  const [displayTemplates, setDisplayTemplates] = useState<typeof templates>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading && templates.length > 0 && !isReady) {
      setDisplayTemplates(templates);
      setIsReady(true);
    }
  }, [loading, templates, isReady]);

  const hasTemplates = displayTemplates.length > 0;
  const showSkeletons = !isReady || loading;

  return (
    <section className="bg-transparent">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-gold">
                {t('badge')}
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white uppercase">
                {t('title')}
              </h2>
              <p className="mt-2 text-gray-700 dark:text-gray-400 max-w-2xl">
                {t('desc')}
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="bg-gold hover:bg-yellow-400 text-gray-900 font-bold border-2 border-black shadow-xl"
            >
              <Link href="/albumes">{t('goToAlbums')}</Link>
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{t('error', { error })}</span>
            </div>
          )}

          {showSkeletons ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
            </div>
          ) : hasTemplates ? (
            <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayTemplates.slice(0, 6).map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  linkPrefix="/albumes"
                  publicMode
                />
              ))}
            </AnimatedList>
          ) : null}

          {!showSkeletons && !hasTemplates && !error && (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-100 dark:bg-gray-800 px-6 py-12 text-center">
              <h3 className="text-2xl font-bold uppercase text-gray-900 dark:text-white">
                {t('emptyTitle')}
              </h3>
              <p className="mt-3 text-gray-600 dark:text-gray-400">
                {t('emptyDesc')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
