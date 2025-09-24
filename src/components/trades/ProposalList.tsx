'use client';

import { useEffect } from 'react';
import { useProposals } from '@/hooks/trades/useProposals';
import { ProposalCard } from './ProposalCard';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Inbox } from 'lucide-react';

interface ProposalListProps {
  box: 'inbox' | 'outbox';
}

export function ProposalList({ box }: ProposalListProps) {
  const { proposals, loading, error, fetchProposals, clearProposals } =
    useProposals();

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
          <ModernCard key={i} className="bg-white/10 animate-pulse">
            <ModernCardContent className="p-4 space-y-3">
              <div className="h-4 bg-gray-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </ModernCardContent>
          </ModernCard>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (proposals.length === 0) {
    return (
      <ModernCard className="bg-white/5 border-dashed border-white/20">
        <ModernCardContent className="p-8 text-center text-gray-400">
          <Inbox className="mx-auto h-12 w-12 mb-4" />
          <p>No hay propuestas en esta bandeja.</p>
        </ModernCardContent>
      </ModernCard>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {proposals.map(proposal => (
        <ProposalCard key={proposal.id} proposal={proposal} box={box} />
      ))}
    </div>
  );
}
