'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { useUser } from '@/components/providers/SupabaseProvider'; // Assuming this path is correct
import { useCreateProposal } from '@/hooks/trades/useCreateProposal';
import { useProposalComposerData } from '../../../hooks/trades/useProposalComposerData';
import { StickerSelector } from '../../../components/trades/StickerSelector';
import { ProposalSummary } from '../../../components/trades/ProposalSummary';
import { ComposerHeader } from '../../../components/trades/ComposerHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { TradeProposalItem } from '@/types';

function ProposalComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const toUserId = searchParams.get('userId');
  const collectionId = searchParams.get('collectionId');

  const {
    data,
    loading: dataLoading,
    error: dataError,
  } = useProposalComposerData({
    fromUserId: user?.id,
    toUserId,
    collectionId: collectionId ? parseInt(collectionId) : null,
  });

  const {
    createProposal,
    loading: submissionLoading,
    error: submissionError,
  } = useCreateProposal();

  const [offerItems, setOfferItems] = useState<TradeProposalItem[]>([]);
  const [requestItems, setRequestItems] = useState<TradeProposalItem[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (dataError) {
      toast.error('Error al cargar datos', {
        description: dataError,
      });
      router.push('/trades/find');
    }
  }, [dataError, router]);

  useEffect(() => {
    if (submissionError) {
      toast.error('Error al crear la propuesta', {
        description: submissionError,
      });
    }
  }, [submissionError]);

  const handleCreateProposal = async () => {
    if (!data?.toUser || !data.collection || !user) return;

    const success = await createProposal({
      collectionId: data.collection.id,
      toUserId: data.toUser.id,
      offerItems,
      requestItems,
      message,
    });

    if (success) {
      toast.success('¡Propuesta enviada con éxito!', {
        description: 'Serás redirigido a tu panel de propuestas.',
      });
      router.push('/trades/proposals');
    }
  };

  const isValidProposal = offerItems.length > 0 || requestItems.length > 0;

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4 text-white"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      {data && (
        <ComposerHeader
          toUser={data.toUser}
          collection={data.collection}
          fromUser={data.fromUser}
        />
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <StickerSelector
            myStickers={data?.myStickers ?? []}
            otherUserStickers={data?.otherUserStickers ?? []}
            selectedOfferItems={offerItems}
            selectedRequestItems={requestItems}
            onOfferItemsChange={setOfferItems}
            onRequestItemsChange={setRequestItems}
            loading={dataLoading}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <ProposalSummary
              offerItems={offerItems}
              requestItems={requestItems}
              targetUserNickname={data?.toUser.nickname ?? '...'}
              message={message}
              onMessageChange={setMessage}
              onSubmit={handleCreateProposal}
              loading={submissionLoading}
              disabled={!isValidProposal || dataLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProposalComposerPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ProposalComposer />
    </Suspense>
  );
}
