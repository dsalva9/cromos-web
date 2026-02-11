'use client';

import { useEffect, useState, useCallback } from 'react';
import { useProposals, type ProposalBox, type ProposalView } from '@/hooks/trades/useProposals';
import { useUnreadCounts } from '@/hooks/trades/useUnreadCounts';
import { ProposalCard } from './ProposalCard';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Inbox } from 'lucide-react';
import { ProposalDetailModal } from './ProposalDetailModal';
import type { TradeProposalListItem, TradeProposalStatus } from '@/types';

interface ProposalListProps {
  box: ProposalBox;
  view?: ProposalView;
  onUnreadCountChange?: (totalUnread: number) => void;
  highlightProposalId?: number | null;
  readOnly?: boolean;
}

export function ProposalList({
  box,
  view = 'active',
  onUnreadCountChange,
  highlightProposalId,
  readOnly = false,
}: ProposalListProps) {
  const { proposals, loading, error } =
    useProposals({ box, view });
  const [optimisticProposals, setOptimisticProposals] = useState<
    TradeProposalListItem[]
  >([]);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(
    null
  );

  // Get trade IDs for unread count fetching
  const tradeIds = proposals.map(p => p.id);

  // Only fetch unread counts for inbox/outbox, not history
  const {
    getCountForTrade,
    totalUnread,
    refresh: refreshUnreadCounts,
  } = useUnreadCounts({
    box: box === 'history' ? 'inbox' : box, // Default to inbox for history
    tradeIds,
    enabled: tradeIds.length > 0 && box !== 'history',
  });

  useEffect(() => {
    setOptimisticProposals(proposals);
  }, [proposals]);

  // Notify parent of unread count changes
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(totalUnread);
    }
  }, [totalUnread, onUnreadCountChange]);

  const handleStatusChange = useCallback(
    (proposalId: number, newStatus: string) => {
      setOptimisticProposals(prev =>
        prev.map(p =>
          p.id === proposalId
            ? { ...p, status: newStatus as TradeProposalStatus }
            : p
        )
      );
    },
    []
  );

  const handleCardClick = (proposalId: number) => {
    setSelectedProposalId(proposalId);
  };

  const handleCloseModal = () => {
    setSelectedProposalId(null);
    // Refresh unread counts after closing modal (in case chat was read)
    refreshUnreadCounts();
  };

  // React Query handles fetching on mount & refetching when box/view change.
  // No manual fetch or cleanup needed.

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <ModernCard key={i} className="bg-white dark:bg-gray-800 border-2 border-black animate-pulse shadow-xl">
            <ModernCardContent className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded-md w-1/2"></div>
            </ModernCardContent>
          </ModernCard>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-[#E84D4D] font-bold">{error}</p>;
  }

  if (optimisticProposals.length === 0) {
    return (
      <ModernCard className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-xl">
        <ModernCardContent className="p-8 text-center text-gray-600 dark:text-gray-400">
          <Inbox className="mx-auto h-12 w-12 mb-4" />
          <p className="font-bold">No hay propuestas en esta bandeja.</p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {optimisticProposals.map(proposal => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            box={box}
            onClick={() => handleCardClick(proposal.id)}
            unreadCount={getCountForTrade(proposal.id)}
            isHighlighted={highlightProposalId === proposal.id}
          />
        ))}
      </div>
      {!readOnly && (
        <ProposalDetailModal
          proposalId={selectedProposalId}
          isOpen={!!selectedProposalId}
          onClose={handleCloseModal}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}

