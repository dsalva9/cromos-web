'use client';

import { useEffect, useState, useCallback } from 'react';
import { useProposals } from '@/hooks/trades/useProposals';
import { ProposalCard } from './ProposalCard';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Inbox } from 'lucide-react';
import { ProposalDetailModal } from './ProposalDetailModal';
import type { TradeProposalListItem, TradeProposalStatus } from '@/types';

interface ProposalListProps {
  box: 'inbox' | 'outbox';
}

export function ProposalList({ box }: ProposalListProps) {
  const { proposals, loading, error, fetchProposals, clearProposals } =
    useProposals();
  const [optimisticProposals, setOptimisticProposals] = useState<
    TradeProposalListItem[]
  >([]);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(
    null
  );

  useEffect(() => {
    setOptimisticProposals(proposals);
  }, [proposals]);

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

  const handleCloseModal = () => setSelectedProposalId(null);

  useEffect(() => {
    // Fetch on mount and when box changes
    fetchProposals({ box, limit: 20, offset: 0 });

    // Cleanup on unmount
    return () => {
      clearProposals();
    };
  }, [box, fetchProposals, clearProposals]);

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <ModernCard key={i} className="bg-gray-800 border-2 border-black animate-pulse shadow-xl">
            <ModernCardContent className="p-4 space-y-3">
              <div className="h-4 bg-gray-600 rounded-md w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded-md w-1/2"></div>
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
      <ModernCard className="bg-gray-800 border-2 border-dashed border-gray-600 shadow-xl">
        <ModernCardContent className="p-8 text-center text-gray-400">
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
          />
        ))}
      </div>
      <ProposalDetailModal
        proposalId={selectedProposalId}
        isOpen={!!selectedProposalId}
        onClose={handleCloseModal}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}

