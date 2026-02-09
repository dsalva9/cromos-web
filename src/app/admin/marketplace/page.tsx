'use client';

import { useState } from 'react';
import { useAdminListings } from '@/hooks/admin/useAdminListings';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, ExternalLink, Trash2, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { useRestoreListing } from '@/hooks/marketplace/useRestoreListing';

function MarketplaceContent() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'delete' | null;
    listingId: string | null;
    listingTitle: string | null;
  }>({ open: false, action: null, listingId: null, listingTitle: null });
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { listings, loading, deleteListing, refresh } =
    useAdminListings(statusFilter, searchQuery);
  const { restoreListing, loading: restoreLoading } = useRestoreListing();

  const handleAction = async () => {
    if (!actionDialog.listingId || !actionDialog.action) return;

    setActionLoading(true);
    try {
      if (actionDialog.action === 'delete') {
        await deleteListing(actionDialog.listingId, reason);
        toast.success('Listado eliminado con éxito (90 días de retención)');
      }
      setActionDialog({ open: false, action: null, listingId: null, listingTitle: null });
      setReason('');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al realizar la acción'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (listingId: string) => {
    try {
      await restoreListing(listingId);
      toast.success('Listado restaurado correctamente');
      refresh();
    } catch (error) {
      toast.error('Error al restaurar el listado');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-500/20 text-green-500',
      reserved: 'bg-blue-500/20 text-blue-500',
      completed: 'bg-gray-500/20 text-gray-500',
      suspended: 'bg-yellow-500/20 text-yellow-500',
      removed: 'bg-red-500/20 text-red-500'
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Gestión de Marketplace
          </h2>
          <p className="text-gray-400">
            Supervisa y modera los listados del marketplace
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar listados..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#111827] border-gray-700 text-white"
              />
            </div>
          </div>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? null : v)}>
            <SelectTrigger className="w-[200px] bg-[#111827] border-gray-700 text-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#111827] border-gray-700">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="reserved">Reservado</SelectItem>
              <SelectItem value="completed">Completado</SelectItem>
              <SelectItem value="suspended">Suspendido</SelectItem>
              <SelectItem value="removed">Eliminado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Listings Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#FFC000]" />
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <ModernCard key={listing.id}>
                <ModernCardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white">
                          {listing.title}
                        </h3>
                        <Badge className={getStatusBadge(listing.status)}>
                          {listing.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>Colección: {listing.collection_name}</p>
                        <p>Vendedor: {listing.seller_nickname}</p>
                        <p>
                          Creado: {format(new Date(listing.created_at), 'PPP', { locale: es })}
                        </p>
                        <p>Vistas: {listing.views_count} | Transacciones: {listing.transaction_count}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Link href={`/marketplace/${listing.id}`} target="_blank">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-gray-600 text-white hover:bg-gray-700"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver listado
                        </Button>
                      </Link>

                      {listing.deleted_at ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(String(listing.id))}
                          disabled={restoreLoading}
                          className="w-full border-green-600 text-green-500 hover:bg-green-600/10"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActionDialog({
                              open: true,
                              action: 'delete',
                              listingId: String(listing.id),
                              listingTitle: listing.title
                            })
                          }
                          className="w-full border-red-600 text-red-500 hover:bg-red-600/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}

            {listings.length === 0 && (
              <ModernCard>
                <ModernCardContent className="p-12 text-center">
                  <p className="text-gray-400">No se encontraron listados</p>
                </ModernCardContent>
              </ModernCard>
            )}
          </div>
        )}

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
          <DialogContent className="bg-slate-800 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>Eliminar Listado</DialogTitle>
              <DialogDescription className="text-slate-400">
                {actionDialog.listingTitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <label className="text-sm font-medium text-slate-300">
                Motivo (requerido)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explica por qué se elimina este listado..."
                rows={3}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-400 mt-2">
                El listado será eliminado permanentemente después de 90 días de retención.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ open: false, action: null, listingId: null, listingTitle: null })}
                disabled={actionLoading}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAction}
                disabled={actionLoading || !reason}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>Confirmar Eliminación</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function AdminMarketplacePage() {
  return (
    <AdminGuard>
      <MarketplaceContent />
    </AdminGuard>
  );
}
