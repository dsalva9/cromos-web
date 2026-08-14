'use client';

import { useState, useMemo } from 'react';
import { useAdminTemplates, AdminTemplate } from '@/hooks/admin/useAdminTemplates';
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
  Star,
  RotateCcw,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Plus,
  Layers,
  CheckCircle2,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from '@/components/ui/link';
import AdminGuard from '@/components/AdminGuard';
import { useRestoreTemplate } from '@/hooks/templates/useRestoreTemplate';

type AdminTemplatesTab = 'all' | 'destacadas';

// Modal for searching and adding new featured templates
function AddFeaturedModal({
  open,
  onOpenChange,
  onAddFeatured,
  featuredIds
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddFeatured: (templateId: number) => Promise<void>;
  featuredIds: Set<number>;
}) {
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState<number | null>(null);

  // Search active templates using the admin hook
  const { templates: searchResults, loading: searchLoading } = useAdminTemplates(
    'active',
    search,
    1,
    20
  );

  const eligibleTemplates = useMemo(() => {
    return searchResults.filter(t => !featuredIds.has(t.id) && !t.deleted_at);
  }, [searchResults, featuredIds]);

  const handleAdd = async (id: number) => {
    setAddingId(id);
    try {
      await onAddFeatured(id);
      toast.success('Plantilla añadida a destacadas con éxito');
      onOpenChange(false);
    } catch {
      toast.error('Error al añadir la plantilla a destacadas');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 text-white border-slate-700 max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <Sparkles className="h-5 w-5 text-gold" />
            Añadir Plantilla a Destacadas
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Busca una plantilla activa para destacarla en la tienda pública. Se añadirá al final de la lista de destacadas.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por título de plantilla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-950 border-gray-700 text-white"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[250px] max-h-[400px]">
          {searchLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
          ) : eligibleTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {search.trim()
                ? 'No se encontraron plantillas activas disponibles con esa búsqueda'
                : 'Escribe un término para buscar plantillas'}
            </div>
          ) : (
            eligibleTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-gold/50 transition-colors"
              >
                <div className="space-y-1 pr-4">
                  <h4 className="font-semibold text-white text-base">{template.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>Autor: {template.author_nickname}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-gold text-gold" />
                      {template.rating_avg.toFixed(1)} ({template.rating_count})
                    </span>
                    <span>•</span>
                    <span>Copias: {template.copies_count}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdd(template.id)}
                  disabled={addingId === template.id}
                  className="bg-gold text-black font-semibold hover:bg-gold/90 shrink-0"
                >
                  {addingId === template.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Destacar
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="border-t border-slate-800 pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 text-gray-300 hover:bg-slate-800"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatesContent() {
  const [activeTab, setActiveTab] = useState<AdminTemplatesTab>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredSearch, setFeaturedSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Dialog for delete action
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'delete' | null;
    templateId: string | null;
    templateTitle: string | null;
  }>({ open: false, action: null, templateId: null, templateTitle: null });
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Hook for "All Templates" tab
  const {
    templates: allTemplates,
    loading: allLoading,
    deleteTemplate,
    toggleFeatured,
    refresh: refreshAll
  } = useAdminTemplates(statusFilter, searchQuery, 1, 50);

  // Hook for "Destacadas" tab (dedicated query fetching all featured templates)
  const {
    templates: featuredTemplates,
    loading: featuredLoading,
    moveFeatured,
    refresh: refreshFeatured
  } = useAdminTemplates(null, null, 1, 100, null, true);

  const { restoreTemplate, loading: restoreLoading } = useRestoreTemplate();
  const [featureLoading, setFeatureLoading] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);

  // Set of IDs currently featured for quick lookup
  const featuredIdsSet = useMemo(() => {
    return new Set(featuredTemplates.map(t => t.id));
  }, [featuredTemplates]);

  // Filtered list of featured templates by search
  const filteredFeaturedTemplates = useMemo(() => {
    if (!featuredSearch.trim()) return featuredTemplates;
    const query = featuredSearch.toLowerCase();
    return featuredTemplates.filter(
      t =>
        t.title.toLowerCase().includes(query) ||
        t.author_nickname.toLowerCase().includes(query)
    );
  }, [featuredTemplates, featuredSearch]);

  const handleAction = async () => {
    if (!actionDialog.templateId || !actionDialog.action) return;

    setActionLoading(true);
    try {
      if (actionDialog.action === 'delete') {
        await deleteTemplate(actionDialog.templateId, reason);
        toast.success('Plantilla eliminada con éxito (90 días de retención, álbumes preservados)');
      }
      setActionDialog({ open: false, action: null, templateId: null, templateTitle: null });
      setReason('');
      refreshFeatured();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Error al realizar la acción'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (templateId: string) => {
    try {
      await restoreTemplate(templateId);
      toast.success('Plantilla restaurada correctamente');
      refreshAll();
      refreshFeatured();
    } catch {
      toast.error('Error al restaurar la plantilla');
    }
  };

  const handleToggleFeatured = async (templateId: number, currentlyFeatured: boolean) => {
    setFeatureLoading(templateId);
    try {
      await toggleFeatured(templateId, !currentlyFeatured);
      toast.success(
        !currentlyFeatured
          ? 'Plantilla destacada correctamente'
          : 'Plantilla quitada de destacados'
      );
      refreshFeatured();
    } catch {
      toast.error('Error al cambiar estado destacado');
    } finally {
      setFeatureLoading(null);
    }
  };

  const handleMove = async (templateId: number, direction: 'up' | 'down') => {
    setMovingId(templateId);
    try {
      await moveFeatured(templateId, direction);
      toast.success('Orden actualizado correctamente');
      refreshAll();
    } catch {
      toast.error('Error al mover la posición');
    } finally {
      setMovingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-500/20 text-green-500 border border-green-500/30',
      suspended: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30',
      deleted: 'bg-red-500/20 text-red-500 border border-red-500/30'
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) {
      return 'bg-gradient-to-r from-amber-500 to-yellow-300 text-black font-black shadow-lg shadow-amber-500/20 border-amber-300';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-slate-300 to-gray-100 text-black font-black border-slate-200';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-amber-700 to-amber-500 text-white font-bold border-amber-600';
    }
    return 'bg-slate-800 text-gold border-gold/30 font-semibold';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Gestión de Plantillas
          </h2>
          <p className="text-gray-400">
            Supervisa, modera y gestiona las plantillas y el orden de destacados
          </p>
        </div>

        {/* Tabs navigation */}
        <div className="flex border-b border-gray-800 space-x-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-3 font-bold text-sm tracking-wider uppercase transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-gold text-gold bg-gray-800/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" />
            Todas las Plantillas
          </button>
          <button
            onClick={() => setActiveTab('destacadas')}
            className={`px-5 py-3 font-bold text-sm tracking-wider uppercase transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'destacadas'
                ? 'border-gold text-gold bg-gray-800/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Plantillas Destacadas
            <Badge className="ml-1.5 bg-gold/20 text-gold border border-gold/30 text-xs px-1.5 py-0.2">
              {featuredTemplates.length}
            </Badge>
          </button>
        </div>

        {/* ── TAB 1: ALL TEMPLATES ─────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar plantillas por título o autor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#111827] border-gray-700 text-white"
                  />
                </div>
              </div>
              <Select
                value={statusFilter || 'all'}
                onValueChange={(v) => setStatusFilter(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[200px] bg-[#111827] border-gray-700 text-white">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-gray-700 text-white">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="suspended">Suspendidas</SelectItem>
                  <SelectItem value="deleted">Eliminadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Templates List */}
            {allLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
              </div>
            ) : (
              <div className="space-y-4">
                {allTemplates.map((template) => (
                  <ModernCard key={template.id}>
                    <ModernCardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-grow space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-bold text-white">
                              {template.title}
                            </h3>
                            <Badge className={getStatusBadge(template.status)}>
                              {template.status}
                            </Badge>
                            {template.is_featured && (
                              <Badge className="bg-gradient-to-r from-amber-500/20 to-gold/20 text-gold border border-gold/30 flex items-center gap-1 font-semibold">
                                <Sparkles className="h-3 w-3 fill-gold" />
                                #{template.featured_priority} Destacada
                              </Badge>
                            )}
                            {!template.is_public && (
                              <Badge className="bg-gray-500/20 text-gray-400 border border-gray-600">
                                Privada
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400 space-y-1">
                            <p>Autor: {template.author_nickname}</p>
                            <p>
                              Creado:{' '}
                              {format(new Date(template.created_at), 'PPP', { locale: es })}
                            </p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-gold text-gold" />
                                <span>
                                  {template.rating_avg.toFixed(1)} ({template.rating_count})
                                </span>
                              </div>
                              <p>Copias: {template.copies_count}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <Link href={`/templates/${template.id}`} target="_blank">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-gray-600 text-white hover:bg-gray-700"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver plantilla
                            </Button>
                          </Link>

                          {/* Featured Toggle */}
                          {!template.deleted_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleToggleFeatured(template.id, template.is_featured)
                              }
                              disabled={featureLoading === template.id}
                              className={`w-full ${
                                template.is_featured
                                  ? 'border-gold text-gold hover:bg-gold/10'
                                  : 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gold'
                              }`}
                            >
                              {featureLoading === template.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                              )}
                              {template.is_featured ? 'Quitar Destacado' : 'Destacar'}
                            </Button>
                          )}

                          {template.deleted_at ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(String(template.id))}
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
                                  templateId: String(template.id),
                                  templateTitle: template.title
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

                {allTemplates.length === 0 && (
                  <ModernCard>
                    <ModernCardContent className="p-12 text-center">
                      <p className="text-gray-400">No se encontraron plantillas</p>
                    </ModernCardContent>
                  </ModernCard>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: DESTACADAS MANAGEMENT ─────────────────────────────────── */}
        {activeTab === 'destacadas' && (
          <div className="space-y-6">
            {/* Info & Action Bar */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-gold/10 text-gold mt-0.5">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-base">
                    Gestión del Orden de Destacadas
                  </h4>
                  <p className="text-sm text-gray-400">
                    El orden aquí establecido define exactamente cómo se muestran las plantillas en la página principal y el explorador público. La posición #1 es la más visible.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gold hover:bg-gold/90 text-black font-bold whitespace-nowrap shrink-0 shadow-lg shadow-gold/20"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Añadir a Destacadas
              </Button>
            </div>

            {/* Quick search within featured templates */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar entre las plantillas destacadas..."
                value={featuredSearch}
                onChange={(e) => setFeaturedSearch(e.target.value)}
                className="pl-10 bg-[#111827] border-gray-700 text-white"
              />
            </div>

            {/* Featured Templates List */}
            {featuredLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
              </div>
            ) : filteredFeaturedTemplates.length === 0 ? (
              <ModernCard>
                <ModernCardContent className="p-12 text-center space-y-3">
                  <Sparkles className="h-10 w-10 text-gold/50 mx-auto" />
                  <p className="text-gray-300 font-medium">
                    {featuredSearch.trim()
                      ? 'No hay plantillas destacadas que coincidan con la búsqueda'
                      : 'No hay ninguna plantilla destacada actualmente'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Puedes destacar plantillas desde la pestaña &quot;Todas las Plantillas&quot; o pulsando el botón &quot;Añadir a Destacadas&quot;.
                  </p>
                </ModernCardContent>
              </ModernCard>
            ) : (
              <div className="space-y-3">
                {filteredFeaturedTemplates.map((template, index) => {
                  const isFirst = index === 0;
                  const isLast = index === filteredFeaturedTemplates.length - 1;
                  const isSearching = Boolean(featuredSearch.trim());

                  return (
                    <ModernCard
                      key={template.id}
                      className="border-gray-800 hover:border-gray-700 transition-colors"
                    >
                      <ModernCardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Rank number & template info */}
                          <div className="flex items-center gap-4 flex-grow">
                            {/* Visual Rank Badge */}
                            <div
                              className={`flex flex-col items-center justify-center min-w-[56px] h-14 rounded-xl border ${getRankBadgeStyle(
                                template.featured_priority
                              )}`}
                            >
                              <span className="text-xs uppercase tracking-wider font-extrabold opacity-75">
                                Pos
                              </span>
                              <span className="text-lg leading-none font-black">
                                #{template.featured_priority}
                              </span>
                            </div>

                            {/* Template details */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-white">
                                  {template.title}
                                </h3>
                                <Badge className={getStatusBadge(template.status)}>
                                  {template.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                                <span>Autor: <strong className="text-gray-300">{template.author_nickname}</strong></span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-gold text-gold" />
                                  {template.rating_avg.toFixed(1)} ({template.rating_count})
                                </span>
                                <span>•</span>
                                <span>Copias: {template.copies_count}</span>
                              </div>
                            </div>
                          </div>

                          {/* Reordering and Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Move Up / Down Buttons */}
                            <div className="flex items-center bg-[#111827] border border-gray-700 rounded-lg p-1">
                              <button
                                onClick={() => handleMove(template.id, 'up')}
                                disabled={isFirst || isSearching || movingId === template.id}
                                className="p-1.5 rounded hover:bg-gold/20 text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={
                                  isSearching
                                    ? 'Limpia la búsqueda para reordenar'
                                    : 'Subir posición (# más prioritario)'
                                }
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <div className="h-4 w-[1px] bg-gray-700 mx-1" />
                              <button
                                onClick={() => handleMove(template.id, 'down')}
                                disabled={isLast || isSearching || movingId === template.id}
                                className="p-1.5 rounded hover:bg-gold/20 text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={
                                  isSearching
                                    ? 'Limpia la búsqueda para reordenar'
                                    : 'Bajar posición (# menos prioritario)'
                                }
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </div>

                            {/* View Template Link */}
                            <Link href={`/templates/${template.id}`} target="_blank">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-700 text-white hover:bg-gray-800"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>

                            {/* Remove from Featured Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleFeatured(template.id, true)}
                              disabled={featureLoading === template.id}
                              className="border-red-800/60 text-red-400 hover:bg-red-900/20 hover:border-red-600 text-xs"
                            >
                              {featureLoading === template.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                              )}
                              Quitar
                            </Button>
                          </div>
                        </div>
                      </ModernCardContent>
                    </ModernCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal: Add to Featured */}
        <AddFeaturedModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onAddFeatured={async (id) => {
            await toggleFeatured(id, true);
            refreshFeatured();
            refreshAll();
          }}
          featuredIds={featuredIdsSet}
        />

        {/* Action Dialog for Deleting */}
        <Dialog
          open={actionDialog.open}
          onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
        >
          <DialogContent className="bg-slate-800 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>Eliminar Plantilla</DialogTitle>
              <DialogDescription className="text-slate-400">
                {actionDialog.templateTitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-4">
              <label className="text-sm font-medium text-slate-300">
                Motivo (requerido)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explica por qué se elimina esta plantilla..."
                rows={3}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-400 mt-2">
                La plantilla será eliminada permanentemente después de 90 días de retención. Los álbumes de usuarios (copias) se preservarán.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setActionDialog({ open: false, action: null, templateId: null, templateTitle: null })
                }
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

export default function AdminTemplatesPage() {
  return (
    <AdminGuard>
      <TemplatesContent />
    </AdminGuard>
  );
}
