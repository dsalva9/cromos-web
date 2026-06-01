'use client';

import { useState } from 'react';
import { X, MapPin, ExternalLink, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from '@/components/ui/link';
import { MatchDetailDrawer } from '@/components/trades/MatchDetailDrawer';

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
}: MatchInfoModalProps) {
  const t = useTranslations('matchChat.info');

  const [detailOpen, setDetailOpen] = useState(false);

  if (!isOpen) return null;

  // Build a minimal TradeMatch for MatchDetailDrawer
  const detailMatch = otherUserId
    ? {
        match_user_id: otherUserId,
        nickname: otherNickname,
        overlap_from_them_to_me: theyHaveCount ?? 0,
        overlap_from_me_to_them: youHaveCount ?? 0,
        total_mutual_overlap: (theyHaveCount ?? 0) + (youHaveCount ?? 0),
        distance_km: distanceKm ?? null,
        postcode: null,
        score: null,
      }
    : null;

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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

            {/* Overlap stats — visual cards */}
            {(theyHaveCount !== undefined || youHaveCount !== undefined) && (
              <div className="grid grid-cols-2 gap-2">
                {theyHaveCount !== undefined && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-green-600 dark:text-green-400 leading-none">
                      {theyHaveCount}
                    </p>
                    <p className="text-[10px] font-bold text-green-600/70 dark:text-green-400/70 mt-1 uppercase">
                      {t('theyHaveShort')}
                    </p>
                  </div>
                )}
                {youHaveCount !== undefined && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">
                      {youHaveCount}
                    </p>
                    <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 mt-1 uppercase">
                      {t('youHaveShort')}
                    </p>
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
            {/* See sticker detail */}
            {templateId && otherUserId && (
              <Button
                variant="outline"
                className="w-full text-sm font-bold border-2 border-gray-300 dark:border-gray-600"
                onClick={() => setDetailOpen(true)}
              >
                <List className="w-4 h-4 mr-1.5" />
                {t('viewDetail')}
              </Button>
            )}

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

      {/* Sticker detail drawer */}
      {detailMatch && templateId && (
        <MatchDetailDrawer
          match={detailMatch}
          collectionId={templateId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </>
  );
}
