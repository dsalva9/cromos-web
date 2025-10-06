import { TradeProposalDetailItem } from '@/types';
import { Badge } from '../ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface ProposalSummaryProps {
  title: string;
  items: Partial<TradeProposalDetailItem>[];
  colorClass: string;
}

export function ProposalSummary({
  title,
  items,
  colorClass,
}: ProposalSummaryProps) {
  const Icon = title === 'Ofreces' ? ArrowDown : ArrowUp;

  return (
    <div>
      <h3
        className={`text-lg font-semibold mb-2 flex items-center ${colorClass}`}
      >
        <Icon className="h-5 w-5 mr-2" />
        {title} ({items.length})
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
        {items.length === 0 ? (
          <p className="text-sm text-white/60">Nada seleccionado.</p>
        ) : (
          items.map(item => (
            <div
              key={item.sticker_id}
              className="flex justify-between items-center text-sm bg-black/20 p-2 rounded-md"
            >
              <span>
                {item.player_name} ({item.sticker_code})
              </span>
              <Badge variant="secondary">x{item.quantity}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

