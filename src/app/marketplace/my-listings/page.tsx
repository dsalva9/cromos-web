'use client';

import { useState } from 'react';
import { useMyListings } from '@/hooks/integration/useMyListings';
import { MyListingCard } from '@/components/integration/MyListingCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Package, ArrowLeft } from 'lucide-react';
import Link from '@/components/ui/link';
import AuthGuard from '@/components/AuthGuard';
import { ListingCardSkeleton } from '@/components/skeletons/ListingCardSkeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ListingStatus = 'active' | 'reserved' | 'completed' | 'removed' | 'ELIMINADO';

function MyListingsContent() {
  const { listings, loading, error, refetch } = useMyListings();
  const [selectedStatus, setSelectedStatus] = useState<ListingStatus>('active');

  // Callback to change tab after actions
  const handleTabChange = (status: ListingStatus) => {
    setSelectedStatus(status);
  };

  const activeListings = listings.filter(l => l.status === 'active');
  const reservedListings = listings.filter(l => l.status === 'reserved');
  const completedListings = listings.filter(l => l.status === 'completed' || l.status === 'sold');
  const eliminadoListings = listings.filter(l => l.status === 'ELIMINADO' || l.status === 'removed');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/marketplace"
          className="inline-flex items-center text-[#FFC000] hover:text-[#FFD700] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Marketplace
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
              Mis Anuncios
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
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

        {/* Mobile Dropdown / Desktop Tabs */}
        <div className="space-y-6">
          {/* Mobile: Dropdown */}
          <div className="md:hidden mb-6">
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ListingStatus)}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Selecciona estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activos ({activeListings.length})</SelectItem>
                <SelectItem value="reserved">Reservados ({reservedListings.length})</SelectItem>
                <SelectItem value="completed">Completados ({completedListings.length})</SelectItem>
                <SelectItem value="ELIMINADO">Eliminados ({eliminadoListings.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tabs */}
          <Tabs defaultValue="active" value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ListingStatus)} className="hidden md:block space-y-6">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="active">
                Activos ({activeListings.length})
              </TabsTrigger>
              <TabsTrigger value="reserved">
                Reservados ({reservedListings.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completados ({completedListings.length})
              </TabsTrigger>
              <TabsTrigger value="ELIMINADO">
                Eliminados ({eliminadoListings.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Active Listings */}
          {selectedStatus === 'active' && (
            <div className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <ListingCardSkeleton key={i} />
                  ))}
                </div>
              ) : activeListings.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No tienes anuncios activos"
                  description="Crea tu primer anuncio para compartir tus cromos con la comunidad"
                  actionLabel="Crear Tu Primer Anuncio"
                  actionHref="/marketplace/create"
                />
              ) : (
                activeListings.map(listing => (
                  <MyListingCard
                    key={listing.id || listing.listing_id}
                    listing={listing}
                    onUpdate={refetch}
                    onTabChange={handleTabChange}
                  />
                ))
              )}
            </div>
          )}

          {/* Reserved Listings */}
          {selectedStatus === 'reserved' && (
            <div className="space-y-4">
              {reservedListings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 dark:text-gray-400">No tienes anuncios reservados</p>
                </div>
              ) : (
                reservedListings.map(listing => (
                  <MyListingCard
                    key={listing.id || listing.listing_id}
                    listing={listing}
                    onUpdate={refetch}
                    onTabChange={handleTabChange}
                  />
                ))
              )}
            </div>
          )}

          {/* Completed Listings */}
          {selectedStatus === 'completed' && (
            <div className="space-y-4">
              {completedListings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 dark:text-gray-400">No tienes anuncios completados</p>
                </div>
              ) : (
                completedListings.map(listing => (
                  <MyListingCard
                    key={listing.id || listing.listing_id}
                    listing={listing}
                    onUpdate={refetch}
                    onTabChange={handleTabChange}
                  />
                ))
              )}
            </div>
          )}

          {/* ELIMINADO Listings (includes both 'ELIMINADO' and 'removed' statuses) */}
          {selectedStatus === 'ELIMINADO' && (
            <div className="space-y-4">
              {eliminadoListings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-600 dark:text-gray-400">No tienes anuncios eliminados</p>
                </div>
              ) : (
                eliminadoListings.map(listing => (
                  <MyListingCard
                    key={listing.id || listing.listing_id}
                    listing={listing}
                    onUpdate={refetch}
                    onTabChange={handleTabChange}
                  />
                ))
              )}
            </div>
          )}
        </div>
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
