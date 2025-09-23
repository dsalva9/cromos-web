'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { useMatchDetail } from '@/hooks/trades/useMatchDetail';
import { ArrowLeft, User, AlertCircle } from 'lucide-react';
import { MatchDetail } from '@/components/trades/MatchDetail';

interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
}

function FindTraderDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();

  const userId = params.userId as string;
  const collectionId = searchParams.get('collectionId');

  const [collection, setCollection] = useState<Collection | null>(null);
  const [targetUserNickname, setTargetUserNickname] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trading detail hook
  const {
    theyOffer,
    iOffer,
    loading: detailLoading,
    error: detailError,
    fetchDetail,
  } = useMatchDetail();

  // Fetch collection info and user data with useCallback
  const fetchData = useCallback(
    async (collectionIdNum: number) => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch collection info
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections')
          .select('id, name, competition, year')
          .eq('id', collectionIdNum)
          .single();

        if (collectionError) throw collectionError;
        if (!collectionData) throw new Error('Colección no encontrada');

        setCollection(collectionData);

        // Fetch target user's nickname
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // Don't throw - user might not have a nickname
        }

        setTargetUserNickname(profileData?.nickname || 'Usuario');

        // Fetch trading details
        await fetchDetail({
          userId: user.id,
          otherUserId: userId,
          collectionId: collectionIdNum,
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [user, userId, supabase, fetchDetail]
  );

  // Validate parameters
  useEffect(() => {
    if (!collectionId || !userId) {
      setError('Parámetros inválidos');
      setLoading(false);
      return;
    }

    const collectionIdNum = parseInt(collectionId);
    if (isNaN(collectionIdNum)) {
      setError('ID de colección inválido');
      setLoading(false);
      return;
    }

    fetchData(collectionIdNum);
  }, [userId, collectionId, user, fetchData]);

  // Handle back navigation
  const handleBack = () => {
    const backUrl = collectionId
      ? `/trades/find?collection=${collectionId}`
      : '/trades/find';
    router.push(backUrl);
  };

  // Show toast for errors
  useEffect(() => {
    const errorToShow = error || detailError;
    if (errorToShow) {
      const toast = document.createElement('div');
      toast.setAttribute('data-toast', 'true');
      toast.className =
        'fixed top-20 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white font-medium bg-red-500';
      toast.textContent = errorToShow;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }, [error, detailError]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">
          Cargando detalles del intercambio...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center p-4">
        <ModernCard className="bg-white max-w-md w-full">
          <ModernCardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button
              onClick={handleBack}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              Volver a búsqueda
            </Button>
          </ModernCardContent>
        </ModernCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="bg-white/90 text-gray-700 border-gray-300 hover:bg-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a búsqueda
          </Button>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
              Intercambio con {targetUserNickname}
            </h1>
            {collection && (
              <p className="text-white/80">
                {collection.name} - {collection.competition} {collection.year}
              </p>
            )}
          </div>
        </div>

        {/* User Info Card */}
        <ModernCard className="bg-white/95 backdrop-blur-sm mb-6">
          <ModernCardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {targetUserNickname}
                </h2>
                <p className="text-gray-600 text-sm">
                  Detalles del intercambio disponible
                </p>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Trading Details */}
        {detailLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Loading skeletons */}
            {[...Array(2)].map((_, i) => (
              <ModernCard key={i} className="bg-white animate-pulse">
                <ModernCardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-4 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        ) : (
          <MatchDetail
            theyOffer={theyOffer}
            iOffer={iOffer}
            targetUserNickname={targetUserNickname}
          />
        )}

        {/* Empty state */}
        {!detailLoading && theyOffer.length === 0 && iOffer.length === 0 && (
          <div className="text-center py-12">
            <ModernCard className="bg-white/90 backdrop-blur-sm max-w-md mx-auto">
              <ModernCardContent className="p-8">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Sin intercambios disponibles
                </h3>
                <p className="text-gray-500 text-sm">
                  No hay coincidencias mutuas con este usuario para la colección
                  seleccionada.
                </p>
              </ModernCardContent>
            </ModernCard>
          </div>
        )}

        {/* Future CTA - Disabled for now */}
        {!detailLoading && (theyOffer.length > 0 || iOffer.length > 0) && (
          <div className="text-center mt-8">
            <Button
              disabled
              className="bg-gray-400 text-gray-600 cursor-not-allowed px-8 py-3"
            >
              Proponer intercambio
              <span className="text-xs ml-2">(Próximamente)</span>
            </Button>
            <p className="text-white/70 text-sm mt-2">
              La funcionalidad de propuestas de intercambio estará disponible
              próximamente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FindTraderDetailPage() {
  return (
    <AuthGuard>
      <FindTraderDetailContent />
    </AuthGuard>
  );
}
