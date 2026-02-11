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
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface MoveToDeletionDialogProps {
  userId: string;
  userNickname: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MoveToDeletionDialog({
  userId,
  userNickname,
  isOpen,
  onClose,
  onSuccess
}: MoveToDeletionDialogProps) {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const handleMoveToDeletion = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('admin_move_to_deletion', {
        p_user_id: userId
      });

      if (error) throw error;

      toast.success(`Usuario ${userNickname} programado para eliminaciÃ³n en 90 dÃ­as`);
      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Error moving to deletion:', error);
      toast.error(error instanceof Error ? error.message : 'Error al programar eliminaciÃ³n');
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
          <DialogTitle>Mover a EliminaciÃ³n</DialogTitle>
          <DialogDescription>
            Programar eliminaciÃ³n permanente de <strong>{userNickname}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Esta acciÃ³n iniciarÃ¡ una cuenta regresiva de 90 dÃ­as para eliminaciÃ³n permanente.</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>El usuario permanecerÃ¡ suspendido (no puede iniciar sesiÃ³n)</li>
                <li>DespuÃ©s de 90 dÃ­as, la cuenta y todo el contenido se eliminarÃ¡n permanentemente</li>
                <li><strong>NO se enviarÃ¡n correos de advertencia al usuario</strong> (a diferencia de auto-eliminaciÃ³n)</li>
                <li>El usuario NO puede cancelar esto por sÃ­ mismo</li>
                <li>TÃº puedes reactivar la cuenta antes de los 90 dÃ­as si es necesario</li>
              </ul>
            </AlertDescription>
          </Alert>

          <p className="text-sm text-gray-400">
            Â¿EstÃ¡s seguro de que quieres programar esta cuenta para eliminaciÃ³n permanente?
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
            variant="destructive"
            onClick={handleMoveToDeletion}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            SÃ­, Programar EliminaciÃ³n
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
