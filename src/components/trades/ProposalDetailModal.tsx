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
        className={`text-lg font-semibold mb-2 flex items-center ${colorClass}`}
      >
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nada.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(item => (
            <li
              key={item.id}
              className="flex justify-between items-center bg-gray-100 p-2 rounded-md"
            >
              <div>
                <p className="font-semibold text-gray-800">
                  {item.player_name}
                </p>
                <p className="text-xs text-gray-500">
                  {item.sticker_code} - {item.team_name}
                </p>
              </div>
              <Badge variant="secondary">x{item.quantity}</Badge>
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
      <DialogContent className="sm:max-w-[625px] bg-white text-black">
        <DialogHeader>
          <DialogTitle>Detalle de la Propuesta</DialogTitle>
          {detail && (
            <DialogDescription>
              Propuesta de <strong>{detail.proposal.from_user_nickname}</strong>{' '}
              para <strong>{detail.proposal.to_user_nickname}</strong>.
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && <p>Cargando detalles...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {detail && (
          <div className="grid gap-6 py-4">
            <ItemList
              title="Lo que se ofrece"
              items={offeredItems}
              icon={<ArrowDown className="h-5 w-5 mr-2" />}
              colorClass="text-green-600"
            />
            <ItemList
              title="Lo que se pide"
              items={requestedItems}
              icon={<ArrowUp className="h-5 w-5 mr-2" />}
              colorClass="text-blue-600"
            />
            {detail.proposal.message && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Mensaje</h3>
                <p className="text-sm text-gray-700 bg-gray-100 p-3 rounded-md">
                  {detail.proposal.message}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {respondError && (
            <p className="text-red-500 text-sm">{respondError}</p>
          )}
          {isPending && isReceiver && (
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={() => handleRespond('reject')}
                disabled={respondLoading}
              >
                <X className="mr-2 h-4 w-4" /> Rechazar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
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

