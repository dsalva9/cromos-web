'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ProposalList } from '@/components/trades/ProposalList';
import { PlusCircle, Inbox, Send, History as HistoryIcon, Eye } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ProposalBox } from '@/hooks/trades';

const UNREAD_BADGE_CAP = 9;

function TradeProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read tab from query param (default to 'inbox')
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'sent' ? 'outbox' : 'inbox';

  // Read highlight param for newly created proposal
  const highlightParam = searchParams.get('highlight');
  const [highlightProposalId, setHighlightProposalId] = useState<number | null>(
    highlightParam ? parseInt(highlightParam) : null
  );

  const [activeTab, setActiveTab] = useState<ProposalBox>(initialTab);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [outboxUnread, setOutboxUnread] = useState(0);
  const [showRejected, setShowRejected] = useState(false);

  // Clear highlight after first render
  useEffect(() => {
    if (highlightProposalId) {
      const timer = setTimeout(() => {
        setHighlightProposalId(null);
        // Remove highlight param from URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete('highlight');
        window.history.replaceState({}, '', url.toString());
      }, 3000); // Show highlight for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [highlightProposalId]);

  const handleNewProposal = () => {
    // Placeholder: In the future, this will likely open a composer modal
    // or navigate to a composer page. For now, we can route to the find page.
    router.push('/trades/find');
  };

  return (
    <div className="min-h-screen bg-[#1F2937] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase text-white">
              Propuestas de Intercambio
            </h1>
            <p className="text-gray-300 font-medium">
              Gestiona tus ofertas enviadas y recibidas.
            </p>
          </div>
          <Button
            onClick={handleNewProposal}
            className="bg-[#FFC000] hover:bg-yellow-400 text-gray-900 border-2 border-black font-bold uppercase rounded-md shadow-xl"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva propuesta
          </Button>
        </div>

        <div className="w-full">
          <div className="max-w-[600px]">
            <SegmentedTabs
              tabs={[
                {
                  value: 'inbox',
                  label: 'Recibidas',
                  icon: <Inbox className="h-4 w-4" />,
                  badge:
                    inboxUnread > 0 ? (
                      <Badge className="ml-1 bg-[#E84D4D] text-white border border-black font-bold text-xs px-1.5 py-0.5 shadow-md">
                        {inboxUnread > UNREAD_BADGE_CAP
                          ? `${UNREAD_BADGE_CAP}+`
                          : inboxUnread}
                      </Badge>
                    ) : undefined,
                },
                {
                  value: 'outbox',
                  label: 'Enviadas',
                  icon: <Send className="h-4 w-4" />,
                  badge:
                    outboxUnread > 0 ? (
                      <Badge className="ml-1 bg-[#E84D4D] text-white border border-black font-bold text-xs px-1.5 py-0.5 shadow-md">
                        {outboxUnread > UNREAD_BADGE_CAP
                          ? `${UNREAD_BADGE_CAP}+`
                          : outboxUnread}
                      </Badge>
                    ) : undefined,
                },
                {
                  value: 'history',
                  label: 'Historial',
                  icon: <HistoryIcon className="h-4 w-4" />,
                },
              ]}
              value={activeTab}
              onValueChange={val => {
                setActiveTab(val as ProposalBox);
                setShowRejected(false); // Reset rejected toggle when switching tabs
              }}
              aria-label="Propuestas de intercambio"
            />
          </div>

          {/* Ver rechazadas toggle (only for inbox/outbox tabs) */}
          {(activeTab === 'inbox' || activeTab === 'outbox') && (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejected(!showRejected)}
                className={`
                  border-2 border-black font-bold uppercase rounded-md shadow-lg
                  ${
                    showRejected
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }
                `}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showRejected ? 'Ocultar rechazadas' : 'Ver rechazadas'}
              </Button>
            </div>
          )}

          <div className="mt-6">
            {activeTab === 'inbox' && !showRejected && (
              <ProposalList
                box="inbox"
                view="active"
                onUnreadCountChange={setInboxUnread}
              />
            )}
            {activeTab === 'inbox' && showRejected && (
              <div>
                <h3 className="text-xl font-bold uppercase text-gray-400 mb-4">
                  Propuestas rechazadas (recibidas)
                </h3>
                <ProposalList box="inbox" view="rejected" readOnly />
              </div>
            )}
            {activeTab === 'outbox' && !showRejected && (
              <ProposalList
                box="outbox"
                view="active"
                onUnreadCountChange={setOutboxUnread}
                highlightProposalId={highlightProposalId}
              />
            )}
            {activeTab === 'outbox' && showRejected && (
              <div>
                <h3 className="text-xl font-bold uppercase text-gray-400 mb-4">
                  Propuestas rechazadas por otros (enviadas)
                </h3>
                <ProposalList box="outbox" view="rejected" readOnly />
              </div>
            )}
            {activeTab === 'history' && (
              <div>
                <h3 className="text-xl font-bold uppercase text-white mb-4">
                  Intercambios finalizados
                </h3>
                <ProposalList box="history" readOnly />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradeProposalsPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
          <div className="text-white font-bold uppercase text-xl">Cargando propuestas...</div>
        </div>
      }>
        <TradeProposalsContent />
      </Suspense>
    </AuthGuard>
  );
}

