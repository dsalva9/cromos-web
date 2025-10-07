'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProposalDetail } from '@/hooks/trades/useProposalDetail';
import { useRespondToProposal } from '@/hooks/trades/useRespondToProposal';
import { useUnreadCounts } from '@/hooks/trades/useUnreadCounts';
import { TradeProposalDetailItem } from '@/types';
import { useUser } from '../providers/SupabaseProvider';
import { TradeChatPanel } from './TradeChatPanel';
import { ArrowDown, ArrowUp, Check, X, Ban, MessageSquare } from 'lucide-react';

interface ProposalDetailModalProps {
  proposalId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (proposalId: number, newStatus: string) => void;
}

// Store tab state per proposal (keyed by proposalId)
const tabStateMap = new Map<number, string>();

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
                <p className="font-bold text-white">{item.player_name}</p>
                <p className="text-xs text-gray-300">
                  {item.sticker_code} - {item.team_name}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="bg-[#FFC000] text-gray-900 border-2 border-black font-bold"
              >
                x{item.quantity}
              </Badge>
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

  // Get saved tab state or default to 'resumen'
  const [activeTab, setActiveTab] = useState<string>('resumen');

  // Track unread count for the Mensajes tab badge
  const { getCountForTrade } = useUnreadCounts({
    box: detail?.proposal.from_user_id === user?.id ? 'outbox' : 'inbox',
    tradeIds: proposalId ? [proposalId] : [],
    enabled: !!proposalId,
  });

  const unreadCount = proposalId ? getCountForTrade(proposalId) : 0;

  useEffect(() => {
    if (isOpen && proposalId) {
      fetchDetail(proposalId);

      // Restore saved tab state for this proposal
      const savedTab = tabStateMap.get(proposalId) || 'resumen';
      setActiveTab(savedTab);
    } else {
      clearDetail();
    }
  }, [isOpen, proposalId, fetchDetail, clearDetail]);

  // Save tab state when it changes
  useEffect(() => {
    if (proposalId) {
      tabStateMap.set(proposalId, activeTab);
    }
  }, [proposalId, activeTab]);

  const handleRespond = async (action: 'accept' | 'reject' | 'cancel') => {
    if (!proposalId) return;
    const newStatus = await respond(proposalId, action);
    if (newStatus) {
      onStatusChange(proposalId, newStatus);

      // If accepted, switch to Mensajes tab instead of closing modal
      if (action === 'accept') {
        setActiveTab('mensajes');
        // Update the stored tab state
        tabStateMap.set(proposalId, 'mensajes');
      } else {
        // For reject/cancel, close the modal
        onClose();
      }
    }
  };

  const isSender = detail?.proposal.from_user_id === user?.id;
  const isReceiver = detail?.proposal.to_user_id === user?.id;
  const isPending = detail?.proposal.status === 'pending';
  const isProposalActive =
    detail?.proposal.status === 'pending' ||
    detail?.proposal.status === 'accepted';

  const offeredItems =
    detail?.items.filter(
      (i: TradeProposalDetailItem) => i.direction === 'offer'
    ) || [];
  const requestedItems =
    detail?.items.filter(
      (i: TradeProposalDetailItem) => i.direction === 'request'
    ) || [];

  const counterpartyNickname = isSender
    ? detail?.proposal.to_user_nickname || 'Usuario'
    : detail?.proposal.from_user_nickname || 'Usuario';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-2 border-black shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold uppercase">
            Detalle de la Propuesta
          </DialogTitle>
          {detail && (
            <DialogDescription className="text-gray-300">
              Propuesta de{' '}
              <strong className="text-[#FFC000]">
                {detail.proposal.from_user_nickname}
              </strong>{' '}
              para{' '}
              <strong className="text-[#FFC000]">
                {detail.proposal.to_user_nickname}
              </strong>
              .
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && <p className="font-bold">Cargando detalles...</p>}
        {error && <p className="text-[#E84D4D] font-bold">{error}</p>}

        {detail && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-2 border-black rounded-md p-1 shadow-xl">
              <TabsTrigger
                value="resumen"
                className="data-[state=active]:bg-[#FFC000] data-[state=active]:text-gray-900 data-[state=active]:font-black data-[state=active]:uppercase data-[state=active]:border-2 data-[state=active]:border-black rounded-md font-bold text-white"
              >
                Resumen
              </TabsTrigger>
              <TabsTrigger
                value="mensajes"
                className="data-[state=active]:bg-[#FFC000] data-[state=active]:text-gray-900 data-[state=active]:font-black data-[state=active]:uppercase data-[state=active]:border-2 data-[state=active]:border-black rounded-md font-bold text-white relative"
              >
                <MessageSquare className="inline h-4 w-4 mr-2" />
                Mensajes
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-[#E84D4D] text-white border-2 border-black font-bold text-xs px-1.5 py-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="mt-4">
              <div className="grid gap-6">
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
                    <h3 className="text-lg font-bold uppercase mb-2">
                      Mensaje
                    </h3>
                    <p className="text-sm text-gray-300 bg-gray-800 p-3 rounded-md border-2 border-black">
                      {detail.proposal.message}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="mensajes" className="mt-4">
              <TradeChatPanel
                tradeId={proposalId}
                counterpartyNickname={counterpartyNickname}
                isProposalActive={isProposalActive}
              />
            </TabsContent>
          </Tabs>
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
