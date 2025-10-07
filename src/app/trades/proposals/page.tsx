'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ProposalList } from '@/components/trades/ProposalList';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const UNREAD_BADGE_CAP = 9;

function TradeProposalsContent() {
  const router = useRouter();
  const [inboxUnread, setInboxUnread] = useState(0);
  const [outboxUnread, setOutboxUnread] = useState(0);

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

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid grid-cols-2 max-w-[400px] bg-gray-800 border-2 border-black rounded-md p-1 shadow-xl">
            <TabsTrigger
              value="inbox"
              className="data-[state=active]:bg-[#FFC000] data-[state=active]:text-gray-900 data-[state=active]:font-black data-[state=active]:uppercase data-[state=active]:border-2 data-[state=active]:border-black rounded-md font-bold text-white relative"
            >
              Recibidas
              {inboxUnread > 0 && (
                <Badge className="ml-2 bg-[#E84D4D] text-white border-2 border-black font-bold text-xs px-2 py-0.5 shadow-md">
                  {inboxUnread > UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP}+` : inboxUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="outbox"
              className="data-[state=active]:bg-[#FFC000] data-[state=active]:text-gray-900 data-[state=active]:font-black data-[state=active]:uppercase data-[state=active]:border-2 data-[state=active]:border-black rounded-md font-bold text-white relative"
            >
              Enviadas
              {outboxUnread > 0 && (
                <Badge className="ml-2 bg-[#E84D4D] text-white border-2 border-black font-bold text-xs px-2 py-0.5 shadow-md">
                  {outboxUnread > UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP}+` : outboxUnread}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inbox" className="mt-6">
            <ProposalList box="inbox" onUnreadCountChange={setInboxUnread} />
          </TabsContent>
          <TabsContent value="outbox" className="mt-6">
            <ProposalList box="outbox" onUnreadCountChange={setOutboxUnread} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function TradeProposalsPage() {
  return (
    <AuthGuard>
      <TradeProposalsContent />
    </AuthGuard>
  );
}

