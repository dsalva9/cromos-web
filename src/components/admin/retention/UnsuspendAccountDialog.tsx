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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface UnsuspendAccountDialogProps {
  userId: string;
  userNickname: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UnsuspendAccountDialog({
  userId,
  userNickname,
  isOpen,
  onClose,
  onSuccess
}: UnsuspendAccountDialogProps) {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const handleUnsuspend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_unsuspend_account', {
        p_user_id: userId
      });

      if (error) throw error;

      toast.success(`Usuario ${userNickname} reactivado con Ã©xito`);
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Error unsuspending account:', error);
      toast.error(error instanceof Error ? error.message : 'Error al reactivar cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reactivar Cuenta</DialogTitle>
          <DialogDescription>
            Restaurar acceso completo a <strong>{userNickname}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-green-900/20 border-green-700">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-sm text-green-200">
              <strong>Esta acciÃ³n restaurarÃ¡ completamente la cuenta:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>El usuario podrÃ¡ iniciar sesiÃ³n nuevamente</li>
                <li>Todo el contenido serÃ¡ visible para otros usuarios</li>
                <li>Se cancelarÃ¡ cualquier eliminaciÃ³n programada</li>
                <li>La suspensiÃ³n se eliminarÃ¡ del registro del usuario</li>
              </ul>
            </AlertDescription>
          </Alert>

          <p className="text-sm text-gray-400">
            Â¿EstÃ¡s seguro de que quieres reactivar esta cuenta?
          </p>
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
            className="bg-green-600 hover:bg-green-700"
            onClick={handleUnsuspend}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            SÃ­, Reactivar Cuenta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
