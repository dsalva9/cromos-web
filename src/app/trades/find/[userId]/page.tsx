'use client';

import { useEffect, useState, useMemo } from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import { useSearchParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { StickerList } from '@/components/trades/StickerList';
import { useTradeDetail } from '@/hooks/trades/useTradeDetail';
import { ArrowLeft } from 'lucide-react';
import { ArrowLeft, PlusCircle } from 'lucide-react';

function TradeDetailPageContent() {
  const router = useRouter();
    router.back();
  };

  const handleCreateProposal = useCallback(() => {
    if (!otherUserId || !collectionId) return;
    router.push(
      `/trades/compose?to_user_id=${otherUserId}&collection_id=${collectionId}`
    );
  }, [router, otherUserId, collectionId]);

  useEffect(() => {
    if (user && otherUserId && collectionId) {
      fetchDetails({
          <Button onClick={handleGoBack} variant="outline" className="bg-transparent text-white hover:bg-white/10 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          {otherUserId && (
            <Button onClick={handleCreateProposal} className="bg-teal-500 hover:bg-teal-600">
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Propuesta
            </Button>
          )}
        </div>

        {loading && <p className="text-center text-white/80">Cargando detalles del intercambio...</p>}