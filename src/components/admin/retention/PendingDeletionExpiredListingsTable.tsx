'use client';

import { useState } from 'react';
import { useAdminPendingDeletionExpiredListings } from '@/hooks/admin/useAdminPendingDeletionExpiredListings';
import { useAdminPermanentDelete } from '@/hooks/admin/useAdminPermanentDelete';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Package, AlertTriangle, Shield, ExternalLink, Archive } from 'lucide-react';
import Link from '@/components/ui/link';
import { LegalHoldControls } from './LegalHoldControls';

export function PendingDeletionExpiredListingsTable() {
  const { listings, loading, error, refetch } = useAdminPendingDeletionExpiredListings();
  const { archiveExpiredListing, loading: deleteLoading } = useAdminPermanentDelete();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    listingId: string;
    title: string;
  }>({
    isOpen: false,
    listingId: '',
    title: '',
  });
  const [legalHoldDialog, setLegalHoldDialog] = useState<{
    isOpen: boolean;
    item: {
      id: number;
      entity_type: string;
      entity_id: string;
      scheduled_for: string;
      legal_hold_until: string | null;
      reason: string | null;
    } | null;
  }>({
    isOpen: false,
    item: null,
  });

  const handleDeleteClick = (listingId: string, title: string) => {
    setConfirmDialog({ isOpen: true, listingId, title });
  };

  const handleConfirmDelete = async () => {
    const result = await archiveExpiredListing(
      confirmDialog.listingId,
      confirmDialog.title
    );
    if (result) {
      setConfirmDialog({ isOpen: false, listingId: '', title: '' });
      refetch();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p>Error loading pending deletion expired listings: {error}</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No expired listings pending archiving</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Collection</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Scheduled For Archiving</TableHead>
              <TableHead>Days Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((listing) => {
              const hasLegalHold = listing.legal_hold_until !== null;

              return (
                <TableRow key={listing.listing_id}>
                  <TableCell className="font-medium text-white">{listing.title}</TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {listing.collection_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/users/${listing.seller_id}`}
                      className="text-sm text-blue-400 hover:underline"
                    >
                      {listing.seller_nickname || 'Unknown'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {formatDate(listing.scheduled_for)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold ${listing.days_remaining <= 7
                          ? 'text-red-500'
                          : listing.days_remaining <= 30
                            ? 'text-orange-500'
                            : 'text-gray-400'
                        }`}
                    >
                      {listing.days_remaining} days
                    </span>
                  </TableCell>
                  <TableCell>
                    {hasLegalHold ? (
                      <Badge className="bg-orange-600 hover:bg-orange-700">
                        <Shield className="h-3 w-3 mr-1" />
                        Legal Hold
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                        Expired
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/marketplace/${listing.listing_id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setLegalHoldDialog({
                            isOpen: true,
                            item: {
                              id: listing.retention_schedule_id,
                              entity_type: 'listing',
                              entity_id: String(listing.listing_id),
                              scheduled_for: listing.scheduled_for,
                              legal_hold_until: listing.legal_hold_until,
                              reason: listing.deletion_reason,
                            },
                          })
                        }
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => handleDeleteClick(String(listing.listing_id), listing.title)}
                        disabled={hasLegalHold || deleteLoading}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, listingId: '', title: '' })}>
        <DialogContent className="bg-[#374151] border-2 border-black text-white">
          <DialogHeader>
            <DialogTitle className="text-purple-400 flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Confirmar Archivado
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              El anuncio será archivado. Esto lo marcará como inactivo pero preservará su historial en el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-[#1F2937] rounded-md border border-gray-700">
            <p className="text-white font-semibold">Listing: {confirmDialog.title}</p>
            <p className="text-gray-400 text-sm">ID: {confirmDialog.listingId}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, listingId: '', title: '' })}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archivando...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archivar ahora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {legalHoldDialog.item && (
        <LegalHoldControls
          item={legalHoldDialog.item}
          isOpen={legalHoldDialog.isOpen}
          onClose={() => setLegalHoldDialog({ isOpen: false, item: null })}
          onSuccess={() => {
            refetch();
            setLegalHoldDialog({ isOpen: false, item: null });
          }}
        />
      )}
    </>
  );
}
