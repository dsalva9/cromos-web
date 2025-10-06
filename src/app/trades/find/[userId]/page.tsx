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
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">
              Detalle del Intercambio
            </h1>
            <p className="text-white/80">
              Viendo cromos en comÃºn con {targetUserNickname}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
            {otherUserId && user && otherUserId !== user.id && (
              <Button
                onClick={handleCreateProposal}
                className="bg-teal-500 hover:bg-teal-600"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Crear Propuesta
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <p className="text-center text-white/80">
            Cargando detalles del intercambio...
          </p>
        )}
        {error && <p className="text-center text-red-300">{error}</p>}
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

