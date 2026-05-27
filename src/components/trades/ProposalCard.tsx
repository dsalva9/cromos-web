'use client';

import { TradeProposalListItem } from '@/types';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { UserLink } from '@/components/ui/user-link';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const UNREAD_BADGE_CAP = 9;

const LOCALE_MAP: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  pt: 'pt-BR',
};

interface ProposalCardProps {
  proposal: TradeProposalListItem;
  box: 'inbox' | 'outbox' | 'history';
  onClick: () => void;
  unreadCount?: number;
  isHighlighted?: boolean;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'accepted':
      return 'bg-green-500 text-white border-2 border-black font-bold uppercase';
    case 'rejected':
    case 'cancelled':
      return 'bg-[#E84D4D] text-white border-2 border-black font-bold uppercase';
    case 'pending':
      return 'bg-gold text-gray-900 border-2 border-black font-bold uppercase';
    default:
      return 'bg-gray-500 text-white border-2 border-black font-bold uppercase';
  }
};

export function ProposalCard({
  proposal,
  box,
  onClick,
  unreadCount = 0,
  isHighlighted = false,
}: ProposalCardProps) {
  const t = useTranslations('trades.proposalCard');
  const locale = useLocale();
  const dateLocale = LOCALE_MAP[locale] || 'es-ES';

  const isInbox = box === 'inbox';
  const counterpartNickname = isInbox
    ? proposal.from_user_nickname
    : proposal.to_user_nickname;
  const counterpartUserId = isInbox
    ? proposal.from_user_id
    : proposal.to_user_id;

  const displayUnreadCount =
    unreadCount > UNREAD_BADGE_CAP
      ? `${UNREAD_BADGE_CAP}+`
      : unreadCount.toString();

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return t('statusPending');
      case 'accepted':
        return t('statusAccepted');
      case 'rejected':
        return t('statusRejected');
      case 'cancelled':
        return t('statusCancelled');
      default:
        return status;
    }
  };

  return (
    <div className="relative">
      {/* Unread badge (top-right corner, outside card) */}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 z-20">
          <Badge className="bg-[#E84D4D] text-white border-2 border-black font-bold text-xs px-2 py-1 shadow-lg">
            {displayUnreadCount}
          </Badge>
        </div>
      )}

      <ModernCard
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 hover:bg-gray-50 transition-all duration-200 cursor-pointer border-2 shadow-xl ${
          isHighlighted
            ? 'border-gold animate-pulse-border'
            : 'border-black'
        }`}
        style={
          isHighlighted
            ? {
                animation: 'pulse-border 1.5s ease-in-out 3',
              }
            : undefined
        }
      >
        <ModernCardContent className="p-4">
          <div className="flex justify-between items-start">
            <p className="font-bold text-lg text-gray-900 dark:text-white uppercase">
              {isInbox ? (
                <ArrowRight className="inline h-4 w-4 mr-2 text-green-400" />
              ) : (
                <ArrowLeft className="inline h-4 w-4 mr-2 text-blue-400" />
              )}
              {isInbox ? t('from') : t('to')}{' '}
              <UserLink
                userId={counterpartUserId || ''}
                nickname={counterpartNickname}
                variant="bold"
                disabled={!counterpartUserId}
              />
            </p>
            <Badge className={getStatusBadgeVariant(proposal.status)}>
              {getStatusLabel(proposal.status)}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 mb-4">
            {new Date(proposal.created_at).toLocaleDateString(dateLocale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded-md border-2 border-black">
              <span className="text-green-400 flex items-center font-bold">
                <ArrowDown className="h-4 w-4 mr-1" /> {t('offers')}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {t('stickers', { count: proposal.offer_item_count })}
              </span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2 rounded-md border-2 border-black">
              <span className="text-blue-400 flex items-center font-bold">
                <ArrowUp className="h-4 w-4 mr-1" /> {t('requests')}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {t('stickers', { count: proposal.request_item_count })}
              </span>
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
}
