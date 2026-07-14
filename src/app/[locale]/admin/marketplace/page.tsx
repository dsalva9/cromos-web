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
import { 
  Loader2, 
  Search, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  Coins, 
  Sparkles, 
  History, 
  Clock, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { es as dateLocaleEs } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from '@/components/ui/link';
import AdminGuard from '@/components/AdminGuard';
import { useRestoreListing } from '@/hooks/marketplace/useRestoreListing';
import { useAdminHighlights } from '@/hooks/admin/useAdminHighlights';
import { useAdminCredits } from '@/hooks/admin/useAdminCredits';
import { useUserSearch } from '@/hooks/admin/useUserSearch';

type AdminTab = 'listings' | 'highlights' | 'credits';

function MarketplaceContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>('listings');

  // ── Tab 1: Listings Moderation State ───────────────────────────────────────
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

  const { listings, loading: listingsLoading, deleteListing, refresh: refreshListings } =
    useAdminListings(statusFilter, searchQuery);
  const { restoreListing, loading: restoreLoading } = useRestoreListing();

  // ── Tab 2: Highlights State ────────────────────────────────────────────────
  const [highlightFilter, setHighlightFilter] = useState<'all' | 'active' | 'expired'>('all');
  const { highlights, loading: highlightsLoading, expireHighlight } = useAdminHighlights(highlightFilter);
  const [expireDialog, setExpireDialog] = useState<{
    open: boolean;
    highlightId: number | null;
    listingTitle: string | null;
  }>({ open: false, highlightId: null, listingTitle: null });
  const [expireLoading, setExpireLoading] = useState(false);

  // ── Tab 3: Credits State ──────────────────────────────────────────────────
  const [creditSearchQuery, setCreditSearchQuery] = useState('');
  const { users: searchedUsers, loading: searchUsersLoading } = useUserSearch(creditSearchQuery, 'all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState('');
  const [adjustingCredits, setAdjustingCredits] = useState(false);

  const {
    balance,
    balanceLoading,
    transactions,
    txLoading,
    adjustCredits
  } = useAdminCredits(selectedUser?.user_id);

  // ── Handlers for Tab 1 ─────────────────────────────────────────────────────
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
      refreshListings();
    } catch (error) {
      toast.error('Error al restaurar el listado');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-500/20 text-green-500 border border-green-500/30',
      reserved: 'bg-blue-500/20 text-blue-500 border border-blue-500/30',
      completed: 'bg-gray-500/20 text-gray-500 border border-gray-500/30',
      suspended: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30',
      removed: 'bg-red-500/20 text-red-500 border border-red-500/30',
      archived: 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
    };
    return variants[status as keyof typeof variants] || 'bg-green-500/20 text-green-500';
  };

  // ── Handlers for Tab 2 ─────────────────────────────────────────────────────
  const handleExpireHighlight = async () => {
    if (!expireDialog.highlightId) return;
    setExpireLoading(true);
    try {
      await expireHighlight(expireDialog.highlightId);
      toast.success('El destacado ha sido finalizado con éxito');
      setExpireDialog({ open: false, highlightId: null, listingTitle: null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al finalizar destacado');
    } finally {
      setExpireLoading(false);
    }
  };

  // ── Handlers for Tab 3 ─────────────────────────────────────────────────────
  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !creditAmount || !creditReason.trim()) return;

    const amountNum = parseInt(creditAmount);
    if (isNaN(amountNum) || amountNum === 0) {
      toast.error('El importe de créditos debe ser un número distinto de cero');
      return;
    }

    setAdjustingCredits(true);
    try {
      await adjustCredits(amountNum, creditReason.trim());
      toast.success('Créditos ajustados correctamente');
      setCreditAmount('');
      setCreditReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al ajustar créditos');
    } finally {
      setAdjustingCredits(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Gestión de Marketplace
            </h2>
            <p className="text-gray-400">
              Supervisa listados, modera destacados y administra saldos de créditos
            </p>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-5 py-3 font-bold text-sm tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === 'listings'
                ? 'border-gold text-gold bg-gray-800/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Moderación de Anuncios
          </button>
          <button
            onClick={() => setActiveTab('highlights')}
            className={`px-5 py-3 font-bold text-sm tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === 'highlights'
                ? 'border-gold text-gold bg-gray-800/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Control de Destacados
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-5 py-3 font-bold text-sm tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === 'credits'
                ? 'border-gold text-gold bg-gray-800/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Gestión de Créditos
          </button>
        </div>

        {/* ── TAB 1: LISTINGS MODERATION ──────────────────────────────────────── */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
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
                  <SelectItem value="archived">Archivado</SelectItem>
                  <SelectItem value="removed">Eliminado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {listingsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <ModernCard key={listing.id}>
                    <ModernCardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-grow space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-bold text-white">
                              {listing.title}
                            </h3>
                            <Badge className={getStatusBadge(listing.status)}>
                              {listing.status}
                            </Badge>
                            {(listing as any).is_highlighted && (
                              <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 fill-amber-500" />
                                Destacado
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400 space-y-1">
                            <p>Colección: {listing.collection_name}</p>
                            <p>Vendedor: {listing.seller_nickname}</p>
                            <p>
                              Creado: {format(new Date(listing.created_at), 'PPP', { locale: dateLocaleEs })}
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
          </div>
        )}

        {/* ── TAB 2: HIGHLIGHTS CONTROL ────────────────────────────────────────── */}
        {activeTab === 'highlights' && (
          <div className="space-y-6">
            {/* Filter controls */}
            <div className="flex justify-start gap-2">
              <Button
                variant={highlightFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHighlightFilter('all')}
                className={highlightFilter === 'all' ? 'bg-gold text-black' : 'border-gray-600 text-white'}
              >
                Todos
              </Button>
              <Button
                variant={highlightFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHighlightFilter('active')}
                className={highlightFilter === 'active' ? 'bg-gold text-black' : 'border-gray-600 text-white'}
              >
                Activos
              </Button>
              <Button
                variant={highlightFilter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHighlightFilter('expired')}
                className={highlightFilter === 'expired' ? 'bg-gold text-black' : 'border-gray-600 text-white'}
              >
                Expirados
              </Button>
            </div>

            {highlightsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
              </div>
            ) : (
              <div className="space-y-4">
                {highlights.map((h) => (
                  <ModernCard key={h.highlight_id}>
                    <ModernCardContent className="p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex-grow space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-black text-white">
                              {h.listing_title}
                            </h3>
                            <Badge className={h.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}>
                              {h.is_active ? 'Activo' : 'Expirado'}
                            </Badge>
                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold">
                              <Coins className="h-3.5 w-3.5" />
                              {h.credit_source === 'rewarded_ad'
                                ? 'Rewarded Ads'
                                : h.credit_source === 'admin_grant'
                                  ? 'Concedido'
                                  : 'Compra Directa'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
                            <div>
                              <span className="block text-xs uppercase tracking-wider text-gray-500">Vendedor</span>
                              <span className="font-bold text-gray-200">{h.nickname}</span>
                            </div>
                            <div>
                              <span className="block text-xs uppercase tracking-wider text-gray-500">Duración</span>
                              <span className="font-bold text-gray-200">{h.duration === '48_hours' ? '48 horas' : '7 días'}</span>
                            </div>
                            <div>
                              <span className="block text-xs uppercase tracking-wider text-gray-500">Coste / Valor</span>
                              <span className="font-bold text-amber-400 flex items-center gap-1">
                                {h.credits_spent > 0 ? `${h.credits_spent} créditos` : `${h.price_eur} €`}
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs uppercase tracking-wider text-gray-500">Visitas Extra</span>
                              <span className="font-black text-green-400">+{h.extra_views} vistas</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Inicio: {format(new Date(h.starts_at), 'PPPp', { locale: dateLocaleEs })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Expiración: {format(new Date(h.expires_at), 'PPPp', { locale: dateLocaleEs })}
                            </span>
                            {h.ls_order_id && (
                              <span>Pedido LS: <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{h.ls_order_id}</code></span>
                            )}
                          </div>
                        </div>

                        {/* Expire Action */}
                        <div className="flex flex-col gap-2 min-w-[200px] shrink-0 self-stretch lg:self-auto justify-center">
                          <Link href={`/marketplace/${h.listing_id}`} target="_blank">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-gray-600 text-white hover:bg-gray-700"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver anuncio
                            </Button>
                          </Link>

                          {h.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setExpireDialog({
                                  open: true,
                                  highlightId: h.highlight_id,
                                  listingTitle: h.listing_title
                                })
                              }
                              className="w-full border-red-500/50 text-red-400 hover:bg-red-950/20 hover:text-red-300"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Finalizar Destacado
                            </Button>
                          )}
                        </div>
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                ))}

                {highlights.length === 0 && (
                  <ModernCard>
                    <ModernCardContent className="p-12 text-center">
                      <p className="text-gray-400">No se encontraron destacados</p>
                    </ModernCardContent>
                  </ModernCard>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: CREDITS MANAGEMENT ───────────────────────────────────────── */}
        {activeTab === 'credits' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: User Search */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-gold" />
                  1. Buscar Usuario
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Escribe email o nickname..."
                    value={creditSearchQuery}
                    onChange={(e) => {
                      setCreditSearchQuery(e.target.value);
                      if (selectedUser) setSelectedUser(null);
                    }}
                    className="pl-10 bg-[#111827] border-gray-700 text-white focus:border-gold"
                  />
                </div>

                {searchUsersLoading && creditSearchQuery.length > 0 ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-gold" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide pr-1">
                    {searchedUsers.map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => setSelectedUser(u)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                          selectedUser?.user_id === u.user_id
                            ? 'border-gold bg-gold/10'
                            : 'border-gray-800 bg-[#111827] hover:border-gray-700'
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-bold text-white text-sm truncate">{u.nickname}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                        <Badge className="bg-gray-800 text-gray-300 text-[10px]">
                          {u.country_code}
                        </Badge>
                      </button>
                    ))}

                    {searchedUsers.length === 0 && creditSearchQuery.length > 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No se encontraron usuarios</p>
                    )}
                  </div>
                )}
              </div>

              {/* Middle Column: Current Balance & Adjustment Form */}
              <div className="space-y-4 lg:col-span-2">
                {selectedUser ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Wallet card */}
                    <div className="md:col-span-1 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 flex flex-col justify-between min-h-[160px]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Saldo del Usuario</span>
                        <h4 className="text-lg font-black text-white mt-1 leading-snug truncate">{selectedUser.nickname}</h4>
                      </div>
                      <div className="mt-4">
                        {balanceLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-amber-500">{balance}</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">créditos</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Form panel */}
                    <form onSubmit={handleAdjustCredits} className="md:col-span-2 space-y-4 bg-[#111827] border border-gray-800 rounded-2xl p-5">
                      <h4 className="font-bold text-white text-sm uppercase tracking-wider">Ajustar Saldo</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Importe</label>
                          <Input
                            type="number"
                            placeholder="Ej. +100 o -50"
                            value={creditAmount}
                            onChange={(e) => setCreditAmount(e.target.value)}
                            required
                            className="bg-gray-900 border-gray-800 text-white focus:border-gold"
                          />
                          <span className="text-[10px] text-gray-500 mt-1 block">Positivo para sumar, negativo para restar</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Motivo / Notas</label>
                          <Input
                            type="text"
                            placeholder="Ej. Compensación soporte"
                            value={creditReason}
                            onChange={(e) => setCreditReason(e.target.value)}
                            required
                            className="bg-gray-900 border-gray-800 text-white focus:border-gold"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={adjustingCredits || !creditAmount || !creditReason.trim()}
                        className="w-full bg-gold text-black font-black uppercase text-xs h-10 tracking-widest rounded-lg hover:bg-yellow-400"
                      >
                        {adjustingCredits ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Ajustar Saldo'
                        )}
                      </Button>
                    </form>

                    {/* Transaction history section below */}
                    <div className="md:col-span-3 space-y-3">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 pt-2 border-t border-gray-800">
                        <History className="h-5 w-5 text-gold" />
                        Historial de Transacciones
                      </h3>

                      {txLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-gold" />
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                          {transactions.map((tx) => (
                            <div key={tx.id} className="p-3 bg-gray-900 border border-gray-800/80 rounded-xl flex items-center justify-between text-sm gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg shrink-0 ${
                                  tx.amount > 0 
                                    ? 'bg-green-500/10 text-green-400' 
                                    : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {tx.amount > 0 ? (
                                    <ArrowUpRight className="h-5 w-5" />
                                  ) : (
                                    <ArrowDownLeft className="h-5 w-5" />
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="font-bold text-white">{tx.description || 'Ajuste de créditos'}</p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(tx.created_at), 'PPPp', { locale: dateLocaleEs })}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className={`font-black text-base block ${
                                  tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                                </span>
                                <span className="text-[10px] text-gray-500 block">Saldo posterior: {tx.balance_after}</span>
                              </div>
                            </div>
                          ))}

                          {transactions.length === 0 && (
                            <p className="text-center text-sm text-gray-500 py-8">El usuario no tiene transacciones en su historial</p>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="h-full min-h-[300px] border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-gray-500">
                    <Coins className="h-10 w-10 text-gray-700 mb-3" />
                    <p className="font-bold">Selecciona un usuario de la lista de búsqueda para gestionar su saldo de créditos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1 Action Dialogs */}
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
                className="bg-slate-900 border-slate-700 text-white focus:border-red-500"
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
                disabled={actionLoading || !reason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
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

        {/* TAB 2 Action Dialogs */}
        <Dialog open={expireDialog.open} onOpenChange={(open) => setExpireDialog({ ...expireDialog, open })}>
          <DialogContent className="bg-slate-800 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>Finalizar Destacado</DialogTitle>
              <DialogDescription className="text-slate-400">
                {expireDialog.listingTitle}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                ¿Estás seguro de que deseas finalizar este anuncio destacado de forma inmediata? El anuncio volverá a la prioridad de orden normal en el marketplace.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExpireDialog({ open: false, highlightId: null, listingTitle: null })}
                disabled={expireLoading}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExpireHighlight}
                disabled={expireLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {expireLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>Finalizar Destacado</>
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
