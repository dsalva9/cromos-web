'use client';

import { X, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';

interface MatchInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherNickname: string;
  collectionTitle?: string | null;
  theyHaveCount?: number;
  youHaveCount?: number;
  distanceKm?: number | null;
  templateId?: number | null;
  otherUserId?: string;
  conversationId?: number | null;
}

export function MatchInfoModal({
  isOpen,
  onClose,
  otherNickname,
  collectionTitle,
  theyHaveCount,
  youHaveCount,
  distanceKm,
  templateId,
  otherUserId,
  conversationId,
}: MatchInfoModalProps) {
  const t = useTranslations('matchChat.info');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">
            {t('title')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* User */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {otherNickname}
            </p>
          </div>

          {/* Collection */}
          {collectionTitle && (
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-3">
              <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                {t('collection')}
              </p>
              <p className="font-bold text-gray-900 dark:text-white">
                {collectionTitle}
              </p>
            </div>
          )}

          {/* Overlap stats */}
          {(theyHaveCount !== undefined || youHaveCount !== undefined) && (
            <div className="space-y-2">
              {theyHaveCount !== undefined && theyHaveCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('theyHave', { count: theyHaveCount })}
                  </span>
                </div>
              )}
              {youHaveCount !== undefined && youHaveCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('youHave', { count: youHaveCount })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Distance */}
          {distanceKm !== undefined && distanceKm !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{t('distance')}: {distanceKm < 1 ? '< 1' : Math.round(distanceKm)} km</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Link href="/intercambios/buscar" className="block">
            <Button
              variant="outline"
              className="w-full text-sm font-bold border-2 border-gray-300 dark:border-gray-600"
              onClick={onClose}
            >
              {t('viewInFinder')}
            </Button>
          </Link>

          {otherUserId && (
            <Link
              href={`/users/${otherUserId}`}
              className="block"
            >
              <Button className="w-full bg-gold hover:bg-yellow-400 text-black font-bold text-sm">
                {t('viewProfile')}
                <ExternalLink className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
