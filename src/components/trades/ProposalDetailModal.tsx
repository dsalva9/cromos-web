'use client';

import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProposalDetail } from '@/hooks/trades/useProposalDetail';
import { useRespondToProposal } from '@/hooks/trades/useRespondToProposal';
import { TradeProposalDetailItem } from '@/types';
import { useUser } from '../providers/SupabaseProvider';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, Check, X, Ban } from 'lucide-react';

interface ProposalDetailModalProps {
  proposalId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (proposalId: number, newStatus: string) => void;
}

function ItemList({
  title,
  items,
  icon,
  colorClass,
}: {
  title: string;
  items: TradeProposalDetailItem[];
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <div>
      <h3
        className={`text-lg font-bold uppercase mb-2 flex items-center ${colorClass}`}
      >
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 font-bold">Nada.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li
              key={item.id}
              className="flex justify-between items-center bg-gray-800 p-3 rounded-md border-2 border-black"
            >
              <div>
                <p className="font-bold text-white">
                  {item.player_name}
                </p>
                <p className="text-xs text-gray-300">
                  {item.sticker_code} - {item.team_name}
                </p>
              </div>
              <Badge variant="secondary" className="bg-[#FFC000] text-gray-900 border-2 border-black font-bold">x{item.quantity}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProposalDetailModal({
  proposalId,
  isOpen,
  onClose,
  onStatusChange,
}: ProposalDetailModalProps) {
  const { user } = useUser();
  const { detail, loading, error, fetchDetail, clearDetail } =
    useProposalDetail();
  const {
    loading: respondLoading,
    error: respondError,
    respond,
  } = useRespondToProposal();

  useEffect(() => {
    if (isOpen && proposalId) {
      fetchDetail(proposalId);
    } else {
      clearDetail();
    }
  }, [isOpen, proposalId, fetchDetail, clearDetail]);

  const handleRespond = async (action: 'accept' | 'reject' | 'cancel') => {
    if (!proposalId) return;
    const newStatus = await respond(proposalId, action);
    if (newStatus) {
      onStatusChange(proposalId, newStatus);
      onClose();
    }
  };

  const isSender = detail?.proposal.from_user_id === user?.id;
  const isReceiver = detail?.proposal.to_user_id === user?.id;
  const isPending = detail?.proposal.status === 'pending';

  const offeredItems =
    detail?.items.filter(
      (i: TradeProposalDetailItem) => i.direction === 'offer'
    ) || [];
  const requestedItems =
    detail?.items.filter(
      (i: TradeProposalDetailItem) => i.direction === 'request'
    ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px] bg-gray-900 text-white border-2 border-black shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold uppercase">Detalle de la Propuesta</DialogTitle>
          {detail && (
            <DialogDescription className="text-gray-300">
              Propuesta de <strong className="text-[#FFC000]">{detail.proposal.from_user_nickname}</strong>{' '}
              para <strong className="text-[#FFC000]">{detail.proposal.to_user_nickname}</strong>.
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && <p className="font-bold">Cargando detalles...</p>}
        {error && <p className="text-[#E84D4D] font-bold">{error}</p>}

        {detail && (
          <div className="grid gap-6 py-4">
            <ItemList
              title="Lo que se ofrece"
              items={offeredItems}
              icon={<ArrowDown className="h-5 w-5 mr-2" />}
              colorClass="text-green-400"
            />
            <ItemList
              title="Lo que se pide"
              items={requestedItems}
              icon={<ArrowUp className="h-5 w-5 mr-2" />}
              colorClass="text-blue-400"
            />
            {detail.proposal.message && (
              <div>
                <h3 className="text-lg font-bold uppercase mb-2">Mensaje</h3>
                <p className="text-sm text-gray-300 bg-gray-800 p-3 rounded-md border-2 border-black">
                  {detail.proposal.message}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {respondError && (
            <p className="text-[#E84D4D] text-sm font-bold">{respondError}</p>
          )}
          {isPending && isReceiver && (
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                className="bg-[#E84D4D] hover:bg-red-600 text-white border-2 border-black font-bold uppercase"
                onClick={() => handleRespond('reject')}
                disabled={respondLoading}
              >
                <X className="mr-2 h-4 w-4" /> Rechazar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white border-2 border-black font-bold uppercase"
                onClick={() => handleRespond('accept')}
                disabled={respondLoading}
              >
                <Check className="mr-2 h-4 w-4" /> Aceptar
              </Button>
            </div>
          )}
          {isPending && isSender && (
            <Button
              variant="destructive"
              className="bg-[#E84D4D] hover:bg-red-600 text-white border-2 border-black font-bold uppercase"
              onClick={() => handleRespond('cancel')}
              disabled={respondLoading}
            >
              <Ban className="mr-2 h-4 w-4" /> Cancelar Propuesta
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

