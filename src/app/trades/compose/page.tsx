'use client';

import { Suspense, FC } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { StickerSelector } from '../../../components/trades/StickerSelector';
import { ProposalSummary } from '../../../components/trades/ProposalSummary';
import { useCreateProposal } from '@/hooks/trades/useCreateProposal';
import { useMatchDetail } from '@/hooks/trades/useMatchDetail'; // Corrected hook name
import {
  StickerWithOwnership,
  TradeProposalDetailItem,
  TradeProposalItemDirection,
} from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/lib/toast';

interface ComposePageProps {
  toUserId: string;
  collectionId: string;
}

const ComposePage: FC<ComposePageProps> = ({ toUserId, collectionId }) => {
  const router = useRouter();
  const { user } = useUser();

  const {
    iOffer: rawMyStickers,
    theyOffer: rawTheirStickers,
    loading: detailsLoading,
    error: detailsError,
    fetchDetail: fetchMatchDetails,
  } = useMatchDetail();

  const {
    loading: createLoading,
    error: createError,
    createProposal,
  } = useCreateProposal();

  const [offerItems, setOfferItems] = useState<TradeProposalDetailItem[]>([]);
  const [requestItems, setRequestItems] = useState<TradeProposalDetailItem[]>(
    []
  );
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

  const myStickers: StickerWithOwnership[] = useMemo(
    () =>
      (rawMyStickers || []).map(s => ({
        id: s.sticker_id,
        collection_id: Number(collectionId),
        team_id: null,
        code: s.sticker_code,
        player_name: s.player_name,
        sticker_number: null,
        position: null,
        nationality: null,
        rating: null,
        rarity: s.rarity,
        image_url: null,
        image_path_webp_300: null,
        thumb_path_webp_100: null,
        created_at: null,
        count: s.count,
        wanted: false,
        team_name: s.team_name,
      })),
    [rawMyStickers, collectionId] // collectionId is needed here
  );

  const theirStickers: StickerWithOwnership[] = useMemo(
    () =>
      (rawTheirStickers || []).map(s => ({
        ...s, // Spreading here is fine as it's a subset
        id: s.sticker_id,
        collection_id: Number(collectionId),
        team_id: null,
        code: s.sticker_code,
        sticker_number: null,
        position: null,
        nationality: null,
        rating: null,
        image_url: null,
        image_path_webp_300: null,
        thumb_path_webp_100: null,
        created_at: null,
        count: s.count,
        wanted: true,
      })),
    [rawTheirStickers, collectionId] // collectionId is needed here
  );

  const handleItemChange = (
    item: StickerWithOwnership,
    quantity: number,
    list: 'offer' | 'request'
  ) => {
    const safeMax = Math.max(0, item.count ?? 0);
    const normalizedQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
    const clampedQuantity = Math.min(Math.max(normalizedQuantity, 0), safeMax);
    const setList = list === 'offer' ? setOfferItems : setRequestItems;

    setList(prev => {
      const existing = prev.find(i => i.sticker_id === item.id);

      if (clampedQuantity === 0) {
        return existing ? prev.filter(i => i.sticker_id !== item.id) : prev;
      }

      if (existing) {
        if (existing.quantity === clampedQuantity) {
          return prev;
        }
        return prev.map(i =>
          i.sticker_id === item.id ? { ...i, quantity: clampedQuantity } : i
        );
      }

      return [
        ...prev,
        {
          ...item,
          team_name: item.team_name || '', // Ensure team_name is always a string
          rarity: item.rarity || 'common', // Ensure rarity is always a string
          sticker_code: item.code, // Map code to sticker_code
          id: 0, // Placeholder for new item
          sticker_id: item.id,
          direction: list as TradeProposalItemDirection,
          quantity: clampedQuantity,
        },
      ];
    });
  };


  const handleSubmit = async () => {
    if (!user || !toUserId || !collectionId) return;

    console.log('[Compose Page] Submitting proposal with toUserId:', toUserId); // DEBUG LOG
    const offerPayload = offerItems
      .map(({ sticker_id, quantity }) => ({
        sticker_id,
        quantity: Math.max(0, Math.floor(quantity)),
      }))
      .filter(item => item.quantity > 0);

    const requestPayload = requestItems
      .map(({ sticker_id, quantity }) => ({
        sticker_id,
        quantity: Math.max(0, Math.floor(quantity)),
      }))
      .filter(item => item.quantity > 0);

    const proposalId = await createProposal({
      collectionId: Number(collectionId),
      toUserId,
      message,
      p_offer_items: offerPayload,
      p_request_items: requestPayload,
    });

    if (proposalId) {
      toast.success('Ã‰xito', {
        description: 'Tu propuesta de intercambio ha sido enviada.',
      });
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
                      placeholder="AÃ±ade un mensaje a tu propuesta..."
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
};

function ComposeProposalPageWrapper() {
  const searchParams = useSearchParams();
  const toUserId = searchParams.get('to_user_id');
  const collectionId = searchParams.get('collection_id');

  if (!toUserId || !collectionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400">Error</h1>
          <p className="text-white/80">
            Faltan parÃ¡metros para crear la propuesta.
          </p>
        </div>
      </div>
    );
  }

  return <ComposePage toUserId={toUserId} collectionId={collectionId} />;
}

export default function SuspendedComposeProposalPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>Cargando...</div>}>
        <ComposeProposalPageWrapper />
      </Suspense>
    </AuthGuard>
  );
}

