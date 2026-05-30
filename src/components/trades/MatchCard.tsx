import { useTranslations } from 'next-intl';
import { UserLink } from '@/components/ui/user-link';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import {
  User,
  TrendingUp,
  MapPin,
  Heart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TradeMatch {
  match_user_id: string;
  nickname: string | null;
  avatar_url?: string | null;
  overlap_from_them_to_me: number;
  overlap_from_me_to_them: number;
  total_mutual_overlap: number;
  distance_km?: number | null;
  postcode?: string | null;
}

interface MatchCardProps {
  match: TradeMatch;
  collectionId: number;
  /** 0-based rank; #0 = top match */
  rank?: number;
}

// Distance bucket (same as grid view)
function formatDistanceShort(km: number | null): string | null {
  if (km == null) return null;
  if (km < 1) return '< 1 km';
  if (km < 3) return '~2 km';
  if (km < 7) return '~5 km';
  if (km < 15) return '~10 km';
  if (km < 35) return '~20 km';
  if (km < 75) return '~50 km';
  if (km < 150) return '~100 km';
  if (km < 350) return '~200 km';
  if (km < 750) return '~500 km';
  return '> 500 km';
}

export function MatchCard({ match, collectionId, rank }: MatchCardProps) {
  const t = useTranslations('trades.finder');
  const displayName = match.nickname || 'Usuario';
  const distText = formatDistanceShort(match.distance_km ?? null);

  return (
    <ModernCard className="bg-white dark:bg-gray-800 border-2 border-black transition-all duration-200 hover:border-gold hover:shadow-2xl cursor-pointer h-full">
      <ModernCardContent className="p-5">
        {/* User Header — bigger avatar, name + distance */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center flex-shrink-0 overflow-hidden">
            {match.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-gold" />
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
            <div className="flex items-center gap-2 mt-0.5">
              {distText && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {distText}
                </span>
              )}
              {match.postcode && !distText && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  📍 {match.postcode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats — two-column layout */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-green-600 dark:text-green-400">{match.overlap_from_them_to_me}</p>
            <p className="text-[10px] font-bold uppercase text-green-600/70 dark:text-green-400/70">{t('theyOfferShort')}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-black text-blue-600 dark:text-blue-400">{match.overlap_from_me_to_them}</p>
            <p className="text-[10px] font-bold uppercase text-blue-600/70 dark:text-blue-400/70">{t('youOfferShort')}</p>
          </div>
        </div>

        {/* Total Mutual Benefit */}
        <div className="flex items-center justify-center p-2.5 bg-gold border-2 border-black rounded-md">
          <TrendingUp className="w-4 h-4 text-gray-900 mr-1.5" />
          <span className="text-xs font-black uppercase text-gray-900">
            {t('mutualTrades', { count: match.total_mutual_overlap })}
          </span>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
