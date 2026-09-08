'use client';

import Link from '@/components/ui/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { FileText, Layout, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AlbumShowcaseCardData {
  id: string | number;
  title: string;
  description: string | null;
  image_url: string | null;
  pages_count: number;
  total_slots?: number;
  slug?: string;
}

interface AlbumShowcaseCardProps {
  template: AlbumShowcaseCardData;
  compact?: boolean;
}

export function AlbumShowcaseCard({ template, compact = false }: AlbumShowcaseCardProps) {
  const t = useTranslations('templates');
  const href = template.slug
    ? `/albumes/${template.slug}`
    : `/albumes/${template.id}`;

  return (
    <Link href={href} className="block group">
      <ModernCard className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gold/40">
        <ModernCardContent className="p-0 flex flex-col h-full">
          {/* Image */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-700 dark:to-slate-800 rounded-t-xl overflow-hidden">
            {template.image_url ? (
              <Image
                src={template.image_url}
                alt={template.title}
                fill
                className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Layout className="w-16 h-16 text-amber-200/60 dark:text-slate-500/50" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-base line-clamp-2 mb-1">
              {template.title}
            </h3>

            {template.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {template.description}
              </p>
            )}

            <div className={`flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-auto ${compact ? '' : 'mb-3'}`}>
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {template.pages_count} pág.
              </span>
              {template.total_slots != null && template.total_slots > 0 && (
                <span className="flex items-center gap-1">
                  <Layout className="h-3.5 w-3.5" />
                  {template.total_slots} cromos
                </span>
              )}
            </div>

            {!compact && (
              <Button
                className="w-full bg-gold text-black hover:bg-gold-light font-medium transition-all duration-300"
                size="sm"
              >
                <Eye className="mr-2 h-4 w-4" />
                {t('card.viewAlbum')}
              </Button>
            )}
          </div>
        </ModernCardContent>
      </ModernCard>
    </Link>
  );
}
