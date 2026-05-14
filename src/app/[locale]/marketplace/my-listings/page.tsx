'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('myListings');
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
          className="inline-flex items-center text-gold hover:text-gold-light mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('back')}
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-gray-900 dark:text-white mb-2">
              {t('title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('description')}
            </p>
          </div>

          <Link href="/marketplace/create">
            <Button className="bg-gold text-black hover:bg-gold-light">
              <Plus className="mr-2 h-4 w-4" />
              {t('newListing')}
            </Button>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            {t('errorLoading')} {error}
          </div>
        )}

        {/* Mobile Dropdown / Desktop Tabs */}
        <div className="space-y-6">
          {/* Mobile: Dropdown */}
          <div className="md:hidden mb-6">
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ListingStatus)}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="{t('selectStatus')}" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('active')} ({activeListings.length})</SelectItem>
                <SelectItem value="reserved">{t('reserved')} ({reservedListings.length})</SelectItem>
                <SelectItem value="completed">{t('completed')} ({completedListings.length})</SelectItem>
                <SelectItem value="ELIMINADO">{t('deleted')} ({eliminadoListings.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Tabs */}
          <Tabs defaultValue="active" value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ListingStatus)} className="hidden md:block space-y-6">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="active">
                {t('active')} ({activeListings.length})
              </TabsTrigger>
              <TabsTrigger value="reserved">
                {t('reserved')} ({reservedListings.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                {t('completed')} ({completedListings.length})
              </TabsTrigger>
              <TabsTrigger value="ELIMINADO">
                {t('deleted')} ({eliminadoListings.length})
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
                  title=t('noActiveTitle')
                  description=t('noActiveDesc')
                  actionLabel=t('createFirst')
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
                  <p className="text-gray-600 dark:text-gray-400">{t('noReserved')}</p>
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
                  <p className="text-gray-600 dark:text-gray-400">{t('noCompleted')}</p>
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
                  <p className="text-gray-600 dark:text-gray-400">{t('noDeleted')}</p>
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
