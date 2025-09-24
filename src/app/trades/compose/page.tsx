'use client';

import { Suspense } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { StickerSelector } from '@/components/trades/StickerSelector';
import { ProposalSummary } from '@/components/trades/ProposalSummary';
import { useCreateProposal } from '@/hooks/trades/useCreateProposal';
import { useMatchDetail } from '@/hooks/trades/useMatchDetail'; // Corrected hook name
import { StickerWithOwnership, TradeProposalItem } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';

function ComposePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const toUserId = searchParams.get('to_user_id');
  const collectionId = searchParams.get('collection_id');

  const {
    iOffer: myStickers,
    theyOffer: theirStickers,
    loading: detailsLoading,
    error: detailsError,
    fetchDetail: fetchMatchDetails,
  } = useMatchDetail(); // Corrected hook usage

  const {
    loading: createLoading,
    error: createError,
    createProposal,
  } = useCreateProposal();

  const [offerItems, setOfferItems] = useState<TradeProposalItem[]>([]);
  const [requestItems, setRequestItems] = useState<TradeProposalItem[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user && toUserId && collectionId) {
      fetchMatchDetails({
        userId: user.id,
        otherUserId: toUserId,
        collectionId: Number(collectionId),
      });
    }
  }, [user, toUserId, collectionId, fetchMatchDetails]);

  const handleItemChange = (
    item: StickerWithOwnership,
    quantity: number,
    list: 'offer' | 'request'
  ) => {
    const setList = list === 'offer' ? setOfferItems : setRequestItems;
    setList(prev => {
      const existing = prev.find(i => i.sticker_id === item.id);
      if (quantity === 0) {
        return prev.filter(i => i.sticker_id !== item.id);
      }
      if (existing) {
        return prev.map(i =>
          i.sticker_id === item.id ? { ...i, quantity } : i
        );
      }
      return [
        ...prev,
        {
          ...item, // Spread all properties from the sticker
          sticker_id: item.id,
          direction: list,
          quantity,
        },
      ];
    });
  };

  const handleSubmit = async () => {
    if (!user || !toUserId || !collectionId) return;

    const proposalId = await createProposal({
      collectionId: Number(collectionId),
      toUserId,
      message,
      p_offer_items: offerItems.map(({ sticker_id, quantity }) => ({
        sticker_id,
        quantity,
      })),
      p_request_items: requestItems.map(({ sticker_id, quantity }) => ({
        sticker_id,
        quantity,
      })),
    });

    if (proposalId) {
      router.push('/trades/proposals');
    }
  };

  const isSubmitDisabled = offerItems.length === 0 && requestItems.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="icon"
            className="mr-4"
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              Crear Propuesta
            </h1>
            <p className="text-white/80">
              Selecciona los cromos que ofreces y los que pides.
            </p>
          </div>
        </div>

        {detailsLoading && <p>Cargando cromos disponibles...</p>}
        {detailsError && <p className="text-red-400">{detailsError}</p>}

        {!detailsLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <StickerSelector
                title="Tus Cromos para Ofrecer"
                stickers={myStickers}
                selectedItems={offerItems}
                onItemChange={(item: StickerWithOwnership, qty: number) =>
                  handleItemChange(item, qty, 'offer')
                }
              />
              <StickerSelector
                title="Sus Cromos para Pedir"
                stickers={theirStickers}
                selectedItems={requestItems}
                onItemChange={(item: StickerWithOwnership, qty: number) =>
                  handleItemChange(item, qty, 'request')
                }
              />
            </div>

            <div className="lg:col-span-1">
              <ModernCard className="bg-white/10 sticky top-8">
                <ModernCardContent className="p-6 space-y-6">
                  <h2 className="text-2xl font-bold border-b border-white/20 pb-4">
                    Resumen de la Propuesta
                  </h2>
                  <ProposalSummary
                    title="Ofreces"
                    items={offerItems}
                    colorClass="text-green-400"
                  />
                  <ProposalSummary
                    title="Pides"
                    items={requestItems}
                    colorClass="text-blue-400"
                  />

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-white/80 mb-2"
                    >
                      Mensaje (opcional)
                    </label>
                    <Textarea
                      id="message"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Añade un mensaje a tu propuesta..."
                      className="bg-black/20 border-white/20 text-white"
                    />
                  </div>

                  {createError && (
                    <p className="text-red-400 text-sm">{createError}</p>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled || createLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600"
                  >
                    {createLoading ? 'Enviando...' : 'Enviar Propuesta'}
                  </Button>
                </ModernCardContent>
              </ModernCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComposeProposalPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Cargando...</div>}>
        <ComposePage />
      </Suspense>
    </AuthGuard>
  );
}
