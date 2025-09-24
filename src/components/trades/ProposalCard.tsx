import { TradeProposalListItem } from '@/types';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, ArrowDown, ArrowUp } from 'lucide-react';
import { useUser } from '../providers/SupabaseProvider';

interface ProposalCardProps {
  proposal: TradeProposalListItem;
  box: 'inbox' | 'outbox';
  onClick: () => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'accepted':
      return 'bg-green-500 text-white';
    case 'rejected':
    case 'cancelled':
      return 'bg-red-500 text-white';
    case 'pending':
      return 'bg-yellow-500 text-black';
    default:
      return 'bg-gray-500 text-white';
  }
};

export function ProposalCard({ proposal, box, onClick }: ProposalCardProps) {
  const { user } = useUser();
  const isInbox = box === 'inbox';
  const counterpartNickname = isInbox
    ? proposal.from_user_nickname
    : proposal.to_user_nickname;

  return (
    <ModernCard
      onClick={onClick}
      className="bg-white/10 hover:bg-white/20 transition-colors duration-200 cursor-pointer"
    >
      <ModernCardContent className="p-4">
        <div className="flex justify-between items-start">
          <p className="font-semibold text-lg text-white">
            {isInbox ? (
              <ArrowRight className="inline h-4 w-4 mr-2 text-green-400" />
            ) : (
              <ArrowLeft className="inline h-4 w-4 mr-2 text-blue-400" />
            )}
            {isInbox ? 'De:' : 'Para:'} {counterpartNickname}
          </p>
          <Badge className={getStatusBadgeVariant(proposal.status)}>
            {proposal.status}
          </Badge>
        </div>
        <p className="text-xs text-gray-400 mt-1 mb-4">
          {new Date(proposal.created_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between bg-black/20 p-2 rounded-md">
            <span className="text-green-400 flex items-center">
              <ArrowDown className="h-4 w-4 mr-1" /> Ofreces
            </span>
            <span className="font-bold">
              {proposal.offer_item_count} cromos
            </span>
          </div>
          <div className="flex items-center justify-between bg-black/20 p-2 rounded-md">
            <span className="text-blue-400 flex items-center">
              <ArrowUp className="h-4 w-4 mr-1" /> Pides
            </span>
            <span className="font-bold">
              {proposal.request_item_count} cromos
            </span>
          </div>
        </div>
      </ModernCardContent>
    </ModernCard>
  );
}
