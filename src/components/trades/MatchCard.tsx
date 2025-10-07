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
      className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC000] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F2937]"
      aria-label={`Ver detalles de intercambio con ${displayName}`}
    >
      <ModernCard className="bg-gray-800 border-2 border-black transition-all duration-200 hover:border-[#FFC000] hover:shadow-2xl cursor-pointer">
        <ModernCardContent className="p-6">
          {/* User Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-[#FFC000] border-2 border-black rounded-md flex items-center justify-center">
              <User className="w-5 h-5 text-gray-900" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold uppercase text-white truncate">{displayName}</h3>
              <p className="text-xs text-gray-400 font-medium">Intercambio disponible</p>
            </div>
          </div>

          {/* Exchange Stats */}
          <div className="space-y-3 mb-4">
            {/* What they can offer me */}
            <div className="flex items-center justify-between p-3 bg-gray-900 border-2 border-black rounded-md">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-green-500 border border-black rounded-md flex items-center justify-center">
                  <ArrowDown className="h-3 w-3 text-white" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold uppercase text-green-400">
                  Te ofrecen
                </span>
              </div>
              <span className="text-xl font-black text-green-400">
                {match.overlap_from_them_to_me}
              </span>
            </div>

            {/* Exchange icon */}
            <div className="flex justify-center">
              <ArrowRightLeft className="w-5 h-5 text-gray-500" />
            </div>

            {/* What I can offer them */}
            <div className="flex items-center justify-between p-3 bg-gray-900 border-2 border-black rounded-md">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 border border-black rounded-md flex items-center justify-center">
                  <ArrowUp className="h-3 w-3 text-white" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold uppercase text-blue-400">
                  Puedes ofrecer
                </span>
              </div>
              <span className="text-xl font-black text-blue-400">
                {match.overlap_from_me_to_them}
              </span>
            </div>
          </div>

          {/* Total Mutual Benefit */}
          <div className="flex items-center justify-center p-3 bg-[#FFC000] border-2 border-black rounded-md">
            <TrendingUp className="w-4 h-4 text-gray-900 mr-2" />
            <span className="text-sm font-black uppercase text-gray-900">
              {match.total_mutual_overlap} intercambios mutuos
            </span>
          </div>
        </ModernCardContent>
      </ModernCard>
    </Link>
  );
}

