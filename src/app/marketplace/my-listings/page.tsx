'use client';

import { useMyListings } from '@/hooks/integration/useMyListings';
import { MyListingCard } from '@/components/integration/MyListingCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';

function MyListingsContent() {
  const { listings, loading, error, refetch } = useMyListings();

  const activeListings = listings.filter(l => l.status === 'active');
  const soldListings = listings.filter(l => l.status === 'sold');
  const removedListings = listings.filter(l => l.status === 'removed');

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-white mb-2">
              Mis Anuncios
            </h1>
            <p className="text-gray-400">
              Gestiona tus anuncios del mercado
            </p>
          </div>

          <Link href="/marketplace/create">
            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700]">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Anuncio
            </Button>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            Error al cargar anuncios: {error}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="active">
              Activos ({activeListings.length})
            </TabsTrigger>
            <TabsTrigger value="sold">
              Vendidos ({soldListings.length})
            </TabsTrigger>
            <TabsTrigger value="removed">
              Eliminados ({removedListings.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Listings */}
          <TabsContent value="active" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
              </div>
            ) : activeListings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg mb-4">
                  No tienes anuncios activos
                </p>
                <Link href="/marketplace/create">
                  <Button className="bg-[#FFC000] text-black">
                    Crear Tu Primer Anuncio
                  </Button>
                </Link>
              </div>
            ) : (
              activeListings.map(listing => (
                <MyListingCard
                  key={listing.id || listing.listing_id}
                  listing={listing}
                  onUpdate={refetch}
                />
              ))
            )}
          </TabsContent>

          {/* Sold Listings */}
          <TabsContent value="sold" className="space-y-4">
            {soldListings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400">No tienes anuncios vendidos</p>
              </div>
            ) : (
              soldListings.map(listing => (
                <MyListingCard
                  key={listing.id || listing.listing_id}
                  listing={listing}
                  onUpdate={refetch}
                />
              ))
            )}
          </TabsContent>

          {/* Removed Listings */}
          <TabsContent value="removed" className="space-y-4">
            {removedListings.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400">No tienes anuncios eliminados</p>
              </div>
            ) : (
              removedListings.map(listing => (
                <MyListingCard
                  key={listing.id || listing.listing_id}
                  listing={listing}
                  onUpdate={refetch}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function MyListingsPage() {
  return (
    <AuthGuard>
      <MyListingsContent />
    </AuthGuard>
  );
}
