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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface SuspendAccountDialogProps {
  userId: string;
  userNickname: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SuspendAccountDialog({
  userId,
  userNickname,
  isOpen,
  onClose,
  onSuccess
}: SuspendAccountDialogProps) {
  const supabase = useSupabaseClient();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSuspend = async () => {
    if (!reason.trim()) {
      toast.error('Por favor proporciona un motivo de suspensiÃ³n');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_suspend_account', {
        p_user_id: userId,
        p_reason: reason.trim()
      });

      if (error) throw error;

      toast.success(`Usuario ${userNickname} suspendido (indefinido, no programado para eliminaciÃ³n)`);
      setReason('');
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Error suspending account:', error);
      toast.error(error instanceof Error ? error.message : 'Error al suspender cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Suspender Cuenta de Usuario</DialogTitle>
          <DialogDescription>
            Suspender la cuenta de <strong>{userNickname}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de suspensiÃ³n *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ej. ViolaciÃ³n de directrices de la comunidad, spam, acoso..."
              rows={4}
              disabled={loading}
              className="resize-none"
            />
          </div>

          <Alert className="bg-blue-900/20 border-blue-700">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-sm text-blue-200">
              <strong>Efectos de la suspensiÃ³n:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>El usuario no puede iniciar sesiÃ³n</li>
                <li>Todo el contenido oculto de usuarios normales</li>
                <li>El usuario recibirÃ¡ un correo de notificaciÃ³n de suspensiÃ³n</li>
                <li>Cuenta suspendida indefinidamente (NO programada para eliminaciÃ³n)</li>
              </ul>
              <p className="mt-2 text-xs">
                DespuÃ©s de suspender, puedes usar "Mover a EliminaciÃ³n" para iniciar una cuenta
                regresiva de 90 dÃ­as si es necesario.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSuspend}
            disabled={!reason.trim() || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Suspender Usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
