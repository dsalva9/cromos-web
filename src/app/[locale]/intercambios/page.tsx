'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Inbox, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ProposalList } from '@/components/trades/ProposalList';
import { useGlobalUnreadBadge } from '@/hooks/trades/useGlobalUnreadBadge';
import { useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';
import type { ProposalBox } from '@/hooks/trades/useProposals';

function IntercambiosContent() {
  const t = useTranslations('trades.hub');
  const { user, loading } = useUser();
  const searchParams = useSearchParams();
  const { totalUnread } = useGlobalUnreadBadge();

  // Read initial tab and highlighted trade from URL params
  const tabParam = searchParams.get('tab');
  const tradeIdParam = searchParams.get('tradeId');

  const [activeTab, setActiveTab] = useState<ProposalBox>(
    tabParam === 'outbox' ? 'outbox' : 'inbox'
  );

  const highlightTradeId = tradeIdParam ? parseInt(tradeIdParam, 10) : null;

  // Sync tab with URL param changes
  useEffect(() => {
    if (tabParam === 'outbox' || tabParam === 'inbox') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Show spinner while auth is resolving or when not authenticated
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('desc')}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 max-w-md">
          <SegmentedTabs
            tabs={[
              {
                value: 'inbox',
                label: t('tabInbox'),
                icon: <Inbox className="h-4 w-4" />,
                badge: totalUnread > 0 ? (
                  <Badge className="ml-1 bg-[#E84D4D] text-white border border-black font-bold text-xs px-1.5 py-0.5">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </Badge>
                ) : undefined,
              },
              {
                value: 'outbox',
                label: t('tabOutbox'),
                icon: <Send className="h-4 w-4" />,
              },
            ]}
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as ProposalBox)}
            aria-label={t('title')}
          />
        </div>

        {/* Proposal List */}
        <ProposalList
          box={activeTab}
          highlightProposalId={highlightTradeId}
        />
      </div>
    </div>
  );
}

export default function IntercambiosPage() {
  return (
    <AuthGuard>
      <IntercambiosContent />
    </AuthGuard>
  );
}
