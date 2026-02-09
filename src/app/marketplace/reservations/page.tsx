'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { useUser, useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { ListingTransactionBadge } from '@/components/marketplace/ListingTransactionBadge';
import { MessageCircle, ExternalLink } from 'lucide-react';

interface BuyerReservation {
  transaction_id: number;
  listing_id: number;
  listing_title: string;
  listing_image_url: string | null;
  seller_nickname: string;
  status: 'reserved' | 'completed' | 'cancelled';
  reserved_at: string;
  completed_at: string | null;
}

function ReservationsPageContent() {
  const { user } = useUser();
  const supabase = useSupabaseClient();
  const [reservations, setReservations] = useState<BuyerReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      if (!user) return;

      // Query listing_transactions where current user is the buyer
      const { data } = await supabase
        .from('listing_transactions')
        .select(`
          id,
          listing_id,
          status,
          reserved_at,
          completed_at,
          trade_listings!inner(id, title, image_url),
          profiles!listing_transactions_seller_id_fkey(nickname)
        `)
        .eq('buyer_id', user.id)
        .in('status', ['reserved', 'completed'])
        .order('reserved_at', { ascending: false });

      if (data) {
        const formatted = data.map((item) => {
          const listing = Array.isArray(item.trade_listings)
            ? item.trade_listings[0]
            : item.trade_listings;
          const seller = Array.isArray(item.profiles)
            ? item.profiles[0]
            : item.profiles;

          return {
            transaction_id: item.id,
            listing_id: item.listing_id,
            listing_title: listing?.title || 'Sin título',
            listing_image_url: listing?.image_url || null,
            seller_nickname: seller?.nickname || 'Vendedor',
            status: item.status as BuyerReservation['status'],
            reserved_at: item.reserved_at,
            completed_at: item.completed_at,
          };
        });
        setReservations(formatted);
      }

      setLoading(false);
    }

    void fetchReservations();
  }, [user, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6">Mis Reservas</h1>

        {reservations.length === 0 ? (
          <ModernCard>
            <ModernCardContent className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
                No tienes ninguna reserva activa
              </p>
              <Link href="/marketplace">
                <Button className="bg-[#FFC000] text-black hover:bg-yellow-400">
                  Explorar Marketplace
                </Button>
              </Link>
            </ModernCardContent>
          </ModernCard>
        ) : (
          <div className="space-y-4">
            {reservations.map(reservation => (
              <ModernCard key={reservation.transaction_id}>
                <ModernCardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Status Badge */}
                    <div className="flex items-start justify-between md:block">
                      <ListingTransactionBadge
                        status={reservation.status}
                        buyerNickname={reservation.seller_nickname}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <Link href={`/marketplace/${reservation.listing_id}`}>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg hover:text-[#FFC000] transition-colors">
                          {reservation.listing_title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Vendedor: {reservation.seller_nickname}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Reservado el{' '}
                        {new Date(reservation.reserved_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col gap-2">
                      <Link href={`/marketplace/${reservation.listing_id}/chat`}>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Chat
                        </Button>
                      </Link>
                      <Link href={`/marketplace/${reservation.listing_id}`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver Anuncio
                        </Button>
                      </Link>
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <AuthGuard>
      <ReservationsPageContent />
    </AuthGuard>
  );
}
