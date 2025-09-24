'use client';

import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProposalList } from '@/components/trades/ProposalList';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

function TradeProposalsContent() {
  const router = useRouter();

  const handleNewProposal = () => {
    // Placeholder: In the future, this will likely open a composer modal
    // or navigate to a composer page. For now, we can route to the find page.
    router.push('/trades/find');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              Propuestas de Intercambio
            </h1>
            <p className="text-white/80">
              Gestiona tus ofertas enviadas y recibidas.
            </p>
          </div>
          <Button
            onClick={handleNewProposal}
            className="bg-teal-500 hover:bg-teal-600"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva propuesta
          </Button>
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
            <TabsTrigger value="inbox">Recibidas</TabsTrigger>
            <TabsTrigger value="outbox">Enviadas</TabsTrigger>
          </TabsList>
          <TabsContent value="inbox" className="mt-6">
            <ProposalList box="inbox" />
          </TabsContent>
          <TabsContent value="outbox" className="mt-6">
            <ProposalList box="outbox" />
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
