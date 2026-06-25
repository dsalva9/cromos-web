import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cleanPlayerName } from '@/utils/cleanPlayerName';

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
    <ModernCard className="bg-white dark:bg-gray-800 border-2 border-black shadow-xl overflow-hidden w-full max-w-full">
      <div className={`${headerColor} px-3 py-2.5 sm:p-4 rounded-t-md border-b-2 border-black`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0">{icon}</span>
          <h3 className="text-xs sm:text-base font-bold uppercase text-white flex-1 min-w-0 truncate">{title}</h3>
          <span className="bg-gray-50 border-2 border-black text-gray-900 text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0">
            {stickers.length}
          </span>
        </div>
      </div>

      <ModernCardContent className="p-0">
        {stickers.length === 0 ? (
          <div className="p-6 text-center text-gray-600 dark:text-gray-400">{emptyMessage}</div>
        ) : (
          <div className="max-h-60 sm:max-h-96 overflow-y-auto overflow-x-hidden">
            {stickers.map((sticker, index) => (
              <div
                key={`${sticker.sticker_id}-${index}`}
                className="px-3 py-2 sm:p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {/* Row: code + count */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-mono text-gray-900 dark:text-white bg-gray-200 px-1.5 py-0.5 rounded border border-black/30 font-bold truncate min-w-0">
                    #{sticker.sticker_code}
                  </span>
                  {sticker.count > 1 && (
                    <span className="text-[10px] font-black text-gold ml-auto">x{sticker.count}</span>
                  )}
                </div>
                {/* Name + team */}
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate mt-0.5">
                  {cleanPlayerName(sticker.player_name, sticker.team_name)}
                  {sticker.team_name && (
                    <span className="text-gray-400 dark:text-gray-500"> · {sticker.team_name}</span>
                  )}
                </p>
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
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2 overflow-hidden w-full max-w-full">
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
        title={`Tú puedes ofrecer a ${targetUserNickname}`}
        emptyMessage="No tienes cromos que este usuario necesite."
        icon={<ArrowUp className="w-5 h-5 text-white" />}
        headerColor="bg-gradient-to-r from-blue-500 to-blue-600"
      />
    </div>
  );
}


