'use client';

import { useState } from 'react';
import { useAdminTemplates } from '@/hooks/admin/useAdminTemplates';
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
import { Loader2, Search, ExternalLink, Trash2, Star, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { useRestoreTemplate } from '@/hooks/templates/useRestoreTemplate';

function TemplatesContent() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'delete' | null;
    templateId: string | null;
    templateTitle: string | null;
  }>({ open: false, action: null, templateId: null, templateTitle: null });
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { templates, loading, deleteTemplate, refresh } =
    useAdminTemplates(statusFilter, searchQuery);
  const { restoreTemplate, loading: restoreLoading } = useRestoreTemplate();

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
      refresh();
    } catch (error) {
      toast.error('Error al restaurar la plantilla');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-500/20 text-green-500',
      suspended: 'bg-yellow-500/20 text-yellow-500',
      deleted: 'bg-red-500/20 text-red-500'
    };
    return variants[status as keyof typeof variants] || variants.active;
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
            Supervisa y modera las plantillas públicas
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar plantillas..."
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
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="suspended">Suspendida</SelectItem>
              <SelectItem value="deleted">Eliminada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Templates Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#FFC000]" />
          </div>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <ModernCard key={template.id}>
                <ModernCardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-grow space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white">
                          {template.title}
                        </h3>
                        <Badge className={getStatusBadge(template.status)}>
                          {template.status}
                        </Badge>
                        {!template.is_public && (
                          <Badge className="bg-gray-500/20 text-gray-500">
                            Privada
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>Autor: {template.author_nickname}</p>
                        <p>
                          Creado: {format(new Date(template.created_at), 'PPP', { locale: es })}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-[#FFC000] text-[#FFC000]" />
                            <span>{template.rating_avg.toFixed(1)} ({template.rating_count})</span>
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

            {templates.length === 0 && (
              <ModernCard>
                <ModernCardContent className="p-12 text-center">
                  <p className="text-gray-400">No se encontraron plantillas</p>
                </ModernCardContent>
              </ModernCard>
            )}
          </div>
        )}

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
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
                onClick={() => setActionDialog({ open: false, action: null, templateId: null, templateTitle: null })}
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
