'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlbumShowcaseCard } from '@/components/home/AlbumShowcaseCard';
import { useTemplates } from '@/hooks/templates/useTemplates';
import { Template } from '@/lib/templates/server-templates';
import { Search, ArrowRight, Loader2 } from 'lucide-react';

interface PublicAlbumsContentProps {
  initialTemplates: Template[];
}

export function PublicAlbumsContent({ initialTemplates }: PublicAlbumsContentProps) {
  const t = useTranslations('albumes');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>('recent');

  const { templates, loading, hasMore, loadMore } = useTemplates({
    search,
    sortBy,
    limit: 18,
    initialData: initialTemplates,
  });

  const sortOptions: { value: 'recent' | 'popular' | 'rating'; label: string }[] = [
    { value: 'recent', label: t('filters.sortRecent') },
    { value: 'popular', label: t('filters.sortPopular') },
    { value: 'rating', label: t('filters.sortRating') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-black uppercase text-gray-900 dark:text-white tracking-tight mb-4">
            {t('meta.jsonLdName')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('meta.description')}
          </p>
        </div>

        {/* Search & Filters */}
        <div className="max-w-4xl mx-auto mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder={t('filters.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-base border-2 border-gray-200 dark:border-gray-700 rounded-xl"
            />
          </div>

          <div className="flex gap-2">
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                variant={sortBy === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(option.value)}
                className={sortBy === option.value
                  ? 'bg-gold text-black hover:bg-gold-light font-bold border-2 border-black'
                  : 'border-2 border-gray-200 dark:border-gray-700 font-medium'
                }
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {templates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {templates.map((template) => (
              <AlbumShowcaseCard
                key={template.id}
                template={template}
              />
            ))}
          </div>
        ) : !loading ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('empty.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('empty.desc')}
            </p>
          </div>
        ) : null}

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <Button
              onClick={loadMore}
              disabled={loading}
              variant="outline"
              size="lg"
              className="border-2 border-gray-300 dark:border-gray-600 font-bold"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {loading ? 'Cargando...' : 'Cargar más'}
            </Button>
          </div>
        )}

        {/* Registration CTA */}
        <div className="max-w-4xl mx-auto mt-16 bg-gradient-to-r from-gold/10 to-amber-100/50 dark:from-gold/5 dark:to-amber-900/20 rounded-2xl border-2 border-gold/30 p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-black uppercase text-gray-900 dark:text-white mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
            {t('cta.desc')}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-gold hover:bg-yellow-400 text-black font-bold border-2 border-black shadow-xl"
          >
            <Link href="/signup">
              {t('cta.button')} <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
