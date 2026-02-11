'use client';

import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface RetentionQueueItem {
  id: number;
  entity_type: string;
  entity_id: string;
  scheduled_for: string;
  legal_hold_until: string | null;
  reason: string | null;
}

interface LegalHoldControlsProps {
  item: RetentionQueueItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LegalHoldControls({
  item,
  isOpen,
  onClose,
  onSuccess
}: LegalHoldControlsProps) {
  const supabase = useSupabaseClient();
  const [holdUntil, setHoldUntil] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const hasActiveLegalHold = item.legal_hold_until !== null && new Date(item.legal_hold_until) > new Date();

  const handleSetLegalHold = async () => {
    if (!holdUntil || !reason.trim()) {
      toast.error('Por favor proporciona una fecha y motivo');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('retention_schedule')
        .update({
          legal_hold_until: holdUntil,
          reason: reason.trim()
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('RetenciÃ³n legal aplicada con Ã©xito');
      setHoldUntil('');
      setReason('');
      onSuccess?.();
    } catch (error) {
      logger.error('Error setting legal hold:', error);
      toast.error(error instanceof Error ? error.message : 'Error al aplicar retenciÃ³n legal');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLegalHold = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('retention_schedule')
        .update({
          legal_hold_until: null
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('RetenciÃ³n legal eliminada');
      onSuccess?.();
    } catch (error) {
      logger.error('Error removing legal hold:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar retenciÃ³n legal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setHoldUntil('');
      setReason('');
      onClose();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'account': return 'Cuenta';
      case 'listing': return 'Anuncio';
      case 'template': return 'Plantilla';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Control de RetenciÃ³n Legal
          </DialogTitle>
          <DialogDescription>
            {getEntityTypeLabel(item.entity_type)} ID: {item.entity_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-blue-900/20 border-blue-700">
            <AlertDescription className="text-sm text-blue-200">
              <p><strong>Programado para eliminaciÃ³n:</strong> {formatDate(item.scheduled_for)}</p>
              {hasActiveLegalHold && (
                <p className="mt-2 text-orange-300">
                  <strong>RetenciÃ³n Legal Activa hasta:</strong> {formatDate(item.legal_hold_until!)}
                  <br />
                  <strong>Motivo:</strong> {item.reason}
                </p>
              )}
            </AlertDescription>
          </Alert>

          {hasActiveLegalHold ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  Este elemento tiene una retenciÃ³n legal activa. La eliminaciÃ³n estÃ¡ pausada hasta
                  que se elimine la retenciÃ³n o expire la fecha de retenciÃ³n.
                </AlertDescription>
              </Alert>

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleRemoveLegalHold}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <X className="mr-2 h-4 w-4" />
                Eliminar RetenciÃ³n Legal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hold-until">Retener hasta *</Label>
                <Input
                  id="hold-until"
                  type="datetime-local"
                  value={holdUntil}
                  onChange={(e) => setHoldUntil(e.target.value)}
                  disabled={loading}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-gray-500">
                  La eliminaciÃ³n se pausarÃ¡ hasta esta fecha
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo legal *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ej. InvestigaciÃ³n legal en curso, orden judicial..."
                  rows={3}
                  disabled={loading}
                  className="resize-none"
                />
              </div>

              <Alert className="bg-orange-900/20 border-orange-700">
                <Shield className="h-4 w-4 text-orange-400" />
                <AlertDescription className="text-sm text-orange-200">
                  <strong>Importante:</strong> Las retenciones legales anulan la programaciÃ³n de eliminaciÃ³n.
                  El elemento NO se eliminarÃ¡ hasta que se elimine la retenciÃ³n o expire.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cerrar
          </Button>
          {!hasActiveLegalHold && (
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleSetLegalHold}
              disabled={!holdUntil || !reason.trim() || loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Shield className="mr-2 h-4 w-4" />
              Aplicar RetenciÃ³n Legal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
