'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser, useSupabase } from '@/components/providers/SupabaseProvider';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { MatchDetail } from '@/components/trades/MatchDetail';
import { useMatchDetail } from '@/hooks/trades/useMatchDetail';
import { ArrowLeft, PlusCircle } from 'lucide-react';

function TradeDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const { supabase } = useSupabase();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { iOffer, theyOffer, loading, error, fetchDetail } = useMatchDetail();
  const [targetUserNickname, setTargetUserNickname] =
    useState<string>('Usuario');

  const otherUserId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;
  const collectionId = searchParams.get('collectionId');

  const handleGoBack = () => {
    router.back();
  };

  const handleCreateProposal = useCallback(() => {
    if (!otherUserId || !collectionId) return;
    console.log('[Find Page] Creating proposal for to_user_id:', otherUserId); // DEBUG LOG
    router.push(
      `/trades/compose?to_user_id=${otherUserId}&collection_id=${collectionId}`
    );
  }, [router, otherUserId, collectionId]);

  useEffect(() => {
    if (user && otherUserId && collectionId) {
      fetchDetail({
        userId: user.id,
        otherUserId,
        collectionId: Number(collectionId),
      });

      const fetchNickname = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', otherUserId)
          .maybeSingle();

        if (profile?.nickname) {
          setTargetUserNickname(profile.nickname);
        }
      };

      fetchNickname();
    }
  }, [user, otherUserId, collectionId, fetchDetail, supabase]);

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase text-white">
              Detalle del Intercambio
            </h1>
            <p className="text-gray-300 font-medium">
              Viendo cromos en común con {targetUserNickname}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="bg-gray-800 text-white hover:bg-gray-700 border-2 border-black rounded-md font-bold uppercase text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
            {otherUserId && user && otherUserId !== user.id && (
              <Button
                onClick={handleCreateProposal}
                className="bg-[#FFC000] hover:bg-yellow-400 text-gray-900 border-2 border-black rounded-md font-bold uppercase text-sm shadow-xl"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Crear Propuesta
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <p className="text-center text-white font-bold uppercase">
            Cargando detalles del intercambio...
          </p>
        )}
        {error && <p className="text-center text-[#E84D4D] font-bold">{error}</p>}
        {!loading && !error && (
          <MatchDetail
            theyOffer={theyOffer}
            iOffer={iOffer}
            targetUserNickname={targetUserNickname}
          />
        )}
      </div>
    </div>
  );
}

export default function TradeDetail() {
  return (
    <AuthGuard>
      <TradeDetailPageContent />
    </AuthGuard>
  );
}

