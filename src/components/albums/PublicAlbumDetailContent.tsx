'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import type { TemplateDetailsResponse } from '@/lib/templates/server-templates';
import { Star, Copy, FileText, Users, ArrowLeft, Share2, Check, Layout } from 'lucide-react';

interface PublicAlbumDetailContentProps {
  data: TemplateDetailsResponse;
  templateId: number;
}

export function PublicAlbumDetailContent({ data, templateId }: PublicAlbumDetailContentProps) {
  const t = useTranslations('albumes.detail');
  const { template, pages } = data;
  const [linkCopied, setLinkCopied] = useState(false);

  const totalSlots = pages.reduce((sum, p) => sum + p.slots_count, 0);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/albumes"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gold transition-colors"
          >
            {t('backLink')}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-gray-600 dark:text-gray-400"
          >
            {linkCopied ? (
              <><Check className="h-4 w-4 mr-1" /> {t('linkCopied')}</>
            ) : (
              <><Share2 className="h-4 w-4 mr-1" /> {t('shareTitle')}</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cover Image */}
            <ModernCard>
              <ModernCardContent className="p-0">
                <div className="relative aspect-video bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-800 rounded-xl overflow-hidden">
                  {template.image_url ? (
                    <Image
                      src={template.image_url}
                      alt={template.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layout className="w-24 h-24 text-amber-200/60 dark:text-slate-500/50" />
                    </div>
                  )}
                </div>
              </ModernCardContent>
            </ModernCard>

            {/* Title & Stats */}
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase text-gray-900 dark:text-white tracking-tight mb-3">
                {template.title}
              </h1>
              {template.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {template.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{t('by')} <strong className="text-gray-900 dark:text-white">{template.author_nickname}</strong></span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span className="font-bold text-gray-900 dark:text-white">{template.rating_avg.toFixed(1)}</span>
                  <span>({template.rating_count} {t('ratingsSuffix')})</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{pages.length} {t('pages')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Copy className="h-4 w-4" />
                  <span>{totalSlots} {t('stickers')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{template.copies_count} {t('collectors')}</span>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <h2 className="text-2xl font-black uppercase text-gray-900 dark:text-white tracking-tight border-b-4 border-gold pb-2 w-fit mb-6">
                {t('checklist')}
              </h2>
              <div className="space-y-6">
                {pages.map((page) => (
                  <ModernCard key={page.id}>
                    <ModernCardContent className="p-4 md:p-6">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3">
                        {t('page')} {page.page_number}: {page.title}
                        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                          ({page.slots_count} {t('stickers')})
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {page.slots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                              slot.is_special
                                ? 'bg-gold/10 border border-gold/30 text-gold-dark dark:text-gold'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <span className="font-mono font-bold text-xs min-w-[2rem]">
                              #{slot.slot_number}{slot.slot_variant || ''}
                            </span>
                            <span className="truncate">
                              {slot.label || `Cromo ${slot.slot_number}`}
                            </span>
                            {slot.is_special && (
                              <span className="ml-auto text-[10px] font-bold uppercase bg-gold/20 px-1.5 py-0.5 rounded">
                                {t('special')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar CTA */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <ModernCard className="border-2 border-gold/30">
                <ModernCardContent className="p-6 space-y-4">
                  <h3 className="text-lg font-black uppercase text-gray-900 dark:text-white">
                    {t('copyTitle')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('copyDesc')}
                  </p>
                  <Button
                    asChild
                    className="w-full bg-gold hover:bg-yellow-400 text-black font-bold border-2 border-black shadow-lg text-base h-12"
                  >
                    <Link href={`/signup?redirect=/templates/${templateId}`}>
                      <Copy className="mr-2 h-5 w-5" />
                      {t('copyButton')}
                    </Link>
                  </Button>
                  <div className="text-center">
                    <Link
                      href={`/login?redirect=/templates/${templateId}`}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gold transition-colors"
                    >
                      {t('signInLink')}
                    </Link>
                  </div>
                </ModernCardContent>
              </ModernCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
