import Link from 'next/link';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { User, ArrowRightLeft, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';

interface TradeMatch {
  match_user_id: string;
  nickname: string | null;
  overlap_from_them_to_me: number;
  overlap_from_me_to_them: number;
  total_mutual_overlap: number;
}

interface MatchCardProps {
  match: TradeMatch;
  collectionId: number;
}

export function MatchCard({ match, collectionId }: MatchCardProps) {
  const displayName = match.nickname || 'Usuario';
  const detailsHref = `/trades/find/${match.match_user_id}?collectionId=${collectionId}`;

  return (
    <Link
      href={detailsHref}
      className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      aria-label={`Ver detalles de intercambio con ${displayName}`}
    >
      <ModernCard className="bg-white transition-all duration-300 hover:scale-105 cursor-pointer">
        <ModernCardContent className="p-6">
          {/* User Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-800 truncate">{displayName}</h3>
              <p className="text-xs text-gray-500">Intercambio disponible</p>
            </div>
          </div>

          {/* Exchange Stats */}
          <div className="space-y-3 mb-4">
            {/* What they can offer me */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowDown className="h-3 w-3 text-green-600" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-green-700">
                  Te pueden ofrecer
                </span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {match.overlap_from_them_to_me}
              </span>
            </div>

            {/* Exchange icon */}
            <div className="flex justify-center">
              <ArrowRightLeft className="w-5 h-5 text-gray-400" />
            </div>

            {/* What I can offer them */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowUp className="h-3 w-3 text-blue-600" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-blue-700">
                  Puedes ofrecer
                </span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                {match.overlap_from_me_to_them}
              </span>
            </div>
          </div>

          {/* Total Mutual Benefit */}
          <div className="flex items-center justify-center p-2 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-teal-600 mr-2" />
            <span className="text-sm font-semibold text-teal-700">
              {match.total_mutual_overlap} intercambios mutuos
            </span>
          </div>
        </ModernCardContent>
      </ModernCard>
    </Link>
  );
}

