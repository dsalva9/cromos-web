import { useTranslations } from 'next-intl';
import { UserLink } from '@/components/ui/user-link';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import {
  User,
  TrendingUp,
} from 'lucide-react';

interface TradeMatch {
  match_user_id: string;
  nickname: string | null;
  avatar_url?: string | null;
  overlap_from_them_to_me: number;
  overlap_from_me_to_them: number;
  total_mutual_overlap: number;
}

interface MatchCardProps {
  match: TradeMatch;
  collectionId: number;
}

export function MatchCard({ match, collectionId }: MatchCardProps) {
  const t = useTranslations('trades.finder');
  const displayName = match.nickname || 'Usuario';

  return (
    <ModernCard className="bg-white dark:bg-gray-800 border-2 border-black transition-all duration-200 hover:border-gold hover:shadow-2xl cursor-pointer h-full">
      <ModernCardContent className="p-4">
        {/* User Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
            {match.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gold" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold uppercase text-gray-900 dark:text-white truncate text-sm">
              <UserLink
                userId={match.match_user_id}
                nickname={match.nickname}
                variant="bold"
                forceSpan={true}
              />
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {t('availableTrade')}
            </p>
          </div>
        </div>

        {/* Compact stats row */}
        <div className="flex items-center gap-2 text-xs font-bold mb-3">
          <span className="text-green-600 dark:text-green-400">
            🟢 {match.overlap_from_them_to_me} {t('theyOfferShort')}
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-blue-600 dark:text-blue-400">
            🔵 {match.overlap_from_me_to_them} {t('youOfferShort')}
          </span>
        </div>

        {/* Total Mutual Benefit */}
        <div className="flex items-center justify-center p-2 bg-gold border-2 border-black rounded-md">
          <TrendingUp className="w-3.5 h-3.5 text-gray-900 mr-1.5" />
          <span className="text-xs font-black uppercase text-gray-900">
            {t('mutualTrades', { count: match.total_mutual_overlap })}
          </span>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
