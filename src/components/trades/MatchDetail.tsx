import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface TradeSticker {
  sticker_id: number;
  sticker_code: string;
  player_name: string;
  team_name: string;
  rarity: string;
  count: number;
}

interface MatchDetailProps {
  theyOffer: TradeSticker[];
  iOffer: TradeSticker[];
  targetUserNickname: string;
}

function getRarityColor(rarity: string) {
  switch (rarity?.toLowerCase()) {
    case 'legendary':
      return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    case 'epic':
      return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white';
    case 'rare':
      return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white';
    case 'common':
      return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
    default:
      return 'bg-gray-200 text-gray-700';
  }
}

function getRarityLabel(rarity: string) {
  switch (rarity?.toLowerCase()) {
    case 'legendary':
      return 'Legendaria';
    case 'epic':
      return 'Ã‰pica';
    case 'rare':
      return 'Rara';
    case 'common':
      return 'ComÃºn';
    default:
      return rarity || 'Desconocida';
  }
}

interface StickerListProps {
  stickers: TradeSticker[];
  title: string;
  emptyMessage: string;
  icon: React.ReactNode;
  headerColor: string;
}

function StickerList({
  stickers,
  title,
  emptyMessage,
  icon,
  headerColor,
}: StickerListProps) {
  return (
    <ModernCard className="bg-white">
      <div className={`${headerColor} p-4 rounded-t-2xl`}>
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {stickers.length}
          </Badge>
        </div>
      </div>

      <ModernCardContent className="p-0">
        {stickers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">{emptyMessage}</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {stickers.map((sticker, index) => (
              <div
                key={`${sticker.sticker_id}-${index}`}
                className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        #{sticker.sticker_code}
                      </span>
                      <Badge
                        variant="secondary"
                        className={getRarityColor(sticker.rarity)}
                      >
                        {getRarityLabel(sticker.rarity)}
                      </Badge>
                    </div>

                    <h4 className="font-semibold text-gray-800 truncate">
                      {sticker.player_name}
                    </h4>

                    <p className="text-sm text-gray-600 truncate">
                      {sticker.team_name}
                    </p>
                  </div>

                  {sticker.count > 1 && (
                    <Badge variant="outline" className="ml-2">
                      x{sticker.count}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  );
}

export function MatchDetail({
  theyOffer,
  iOffer,
  targetUserNickname,
}: MatchDetailProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* What they can offer me */}
      <StickerList
        stickers={theyOffer}
        title={`${targetUserNickname} te puede ofrecer`}
        emptyMessage="Este usuario no tiene cromos que necesites."
        icon={<ArrowDown className="w-5 h-5 text-white" />}
        headerColor="bg-gradient-to-r from-green-500 to-green-600"
      />

      {/* What I can offer them */}
      <StickerList
        stickers={iOffer}
        title={`TÃº puedes ofrecer a ${targetUserNickname}`}
        emptyMessage="No tienes cromos que este usuario necesite."
        icon={<ArrowUp className="w-5 h-5 text-white" />}
        headerColor="bg-gradient-to-r from-blue-500 to-blue-600"
      />
    </div>
  );
}

