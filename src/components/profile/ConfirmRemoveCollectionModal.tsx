'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmRemoveCollectionModalProps {
  open: boolean;
  name: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function ConfirmRemoveCollectionModal({
  open,
  name,
  onConfirm,
  onClose,
  loading = false,
}: ConfirmRemoveCollectionModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md ring-1 ring-black/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-rose-600 dark:text-rose-400 text-xl font-bold">
            Eliminar colección de tu perfil
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2">
            <p className="text-gray-600 dark:text-gray-400">
              ¿Estás seguro de que quieres eliminar &ldquo;{name}&rdquo; de tu
              perfil?
            </p>
            <p className="text-sm text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg ring-1 ring-rose-100 dark:ring-rose-800">
              <strong>
                Se eliminarán también todos tus datos de esta colección
              </strong>{' '}
              (tengo/duplicados/faltan). Esta acción no se puede deshacer.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ring-0 focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 text-white ring-0 focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
