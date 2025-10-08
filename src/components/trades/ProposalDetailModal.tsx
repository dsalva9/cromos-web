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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { useProposalDetail } from '@/hooks/trades/useProposalDetail';
import { useRespondToProposal } from '@/hooks/trades/useRespondToProposal';
import { useTradeFinalization } from '@/hooks/trades/useTradeFinalization';
import { useUnreadCounts } from '@/hooks/trades/useUnreadCounts';
import { TradeProposalDetailItem } from '@/types';
import { useUser, useSupabase } from '../providers/SupabaseProvider';
import { TradeChatPanel } from './TradeChatPanel';
import { ArrowDown, ArrowUp, Check, X, Ban, MessageSquare, FileText, CheckCircle } from 'lucide-react';

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
  const { supabase } = useSupabase();
  const { detail, loading, error, fetchDetail, clearDetail } =
    useProposalDetail();
  const {
    loading: respondLoading,
    error: respondError,
    respond,
  } = useRespondToProposal();
  const { markAsFinalized, loading: finalizingLoading } = useTradeFinalization();

  // Finalization state
  const [finalizationCount, setFinalizationCount] = useState<number>(0);
  const [hasUserFinalized, setHasUserFinalized] = useState<boolean>(false);

  // Get saved tab state or default to 'resumen'
  const [activeTab, setActiveTab] = useState<string>('resumen');

  // Track unread count for the Mensajes tab badge
  const { getCountForTrade } = useUnreadCounts({
    box: detail?.proposal.from_user_id === user?.id ? 'outbox' : 'inbox',
    tradeIds: proposalId ? [proposalId] : [],
    enabled: !!proposalId,
  });

  const unreadCount = proposalId ? getCountForTrade(proposalId) : 0;

  // Fetch finalization status
  const fetchFinalizationStatus = async (tradeId: number) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trade_finalizations')
        .select('user_id')
        .eq('trade_id', tradeId);

      if (error) throw error;

      const finalizations = data || [];
      setFinalizationCount(finalizations.length);
      setHasUserFinalized(finalizations.some(f => f.user_id === user.id));
    } catch (err) {
      console.error('Error fetching finalization status:', err);
    }
  };

  useEffect(() => {
    if (isOpen && proposalId) {
      fetchDetail(proposalId);
      fetchFinalizationStatus(proposalId);

      // Restore saved tab state for this proposal
      const savedTab = tabStateMap.get(proposalId) || 'resumen';
      setActiveTab(savedTab);
    } else {
      clearDetail();
      setFinalizationCount(0);
      setHasUserFinalized(false);
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

  const handleFinalize = async () => {
    if (!proposalId) return;

    const result = await markAsFinalized(proposalId);
    if (result) {
      // Update local state optimistically
      setHasUserFinalized(true);
      setFinalizationCount(prev => prev + 1);

      // If both finalized, refresh and close modal
      if (result.both_finalized) {
        await fetchDetail(proposalId);
        setTimeout(() => {
          onClose();
        }, 1500); // Give user time to see success message
      }
    }
  };

  const isSender = detail?.proposal.from_user_id === user?.id;
  const isReceiver = detail?.proposal.to_user_id === user?.id;
  const isPending = detail?.proposal.status === 'pending';
  const isAccepted = detail?.proposal.status === 'accepted';
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
          <>
            <SegmentedTabs
              tabs={[
                {
                  value: 'resumen',
                  label: 'Resumen',
                  icon: <FileText className="h-4 w-4" />,
                },
                {
                  value: 'mensajes',
                  label: 'Mensajes',
                  icon: <MessageSquare className="h-4 w-4" />,
                  badge:
                    unreadCount > 0 ? (
                      <Badge className="ml-1 bg-[#E84D4D] text-white border border-black font-bold text-xs px-1.5 py-0.5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    ) : undefined,
                },
              ]}
              value={activeTab}
              onValueChange={setActiveTab}
              aria-label="Detalle de propuesta"
            />

            <div className="mt-4">
              {activeTab === 'resumen' && (
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

                  {/* Finalization status (only show for accepted proposals) */}
                  {isAccepted && (
                    <div className="bg-gray-800 border-2 border-black rounded-md p-4">
                      <h3 className="text-lg font-bold uppercase mb-2 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                        Estado de Finalización
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-300">
                            Marcados como finalizados:
                          </span>
                          <Badge
                            className={`${
                              finalizationCount === 2
                                ? 'bg-green-600'
                                : 'bg-[#FFC000]'
                            } text-gray-900 border-2 border-black font-bold`}
                          >
                            {finalizationCount}/2
                          </Badge>
                        </div>
                        {hasUserFinalized && (
                          <p className="text-xs text-green-400 font-bold">
                            ✓ Ya has marcado este intercambio como finalizado
                          </p>
                        )}
                        {finalizationCount === 1 && !hasUserFinalized && (
                          <p className="text-xs text-yellow-400 font-bold">
                            ⚠ La otra persona ya marcó como finalizado. Falta tu confirmación.
                          </p>
                        )}
                        {finalizationCount === 2 && (
                          <p className="text-xs text-green-400 font-bold">
                            ✓ Intercambio completado por ambas partes
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'mensajes' && (
                <TradeChatPanel
                  tradeId={proposalId}
                  counterpartyNickname={counterpartyNickname}
                  isProposalActive={isProposalActive}
                />
              )}
            </div>
          </>
        )}

        <DialogFooter>
          {respondError && (
            <p className="text-[#E84D4D] text-sm font-bold">{respondError}</p>
          )}

          {/* Finalization button (only for accepted proposals) */}
          {isAccepted && !hasUserFinalized && finalizationCount < 2 && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white border-2 border-black font-bold uppercase"
              onClick={handleFinalize}
              disabled={finalizingLoading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {finalizingLoading ? 'Marcando...' : 'Marcar como finalizado'}
            </Button>
          )}

          {/* Response buttons (only for pending proposals) */}
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
