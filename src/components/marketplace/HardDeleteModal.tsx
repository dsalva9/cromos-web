'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, MessageSquare, FileImage, CheckCircle } from 'lucide-react';

interface HardDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  listing: {
    id: string;
    title: string;
    status: string;
    hasActiveChats?: boolean;
    hasActiveTransactions?: boolean;
  };
  loading?: boolean;
}

type Step = 'warning' | 'confirmation' | 'deleting' | 'success';

export function HardDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  listing,
  loading = false
}: HardDeleteModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('warning');
  const [isChecked, setIsChecked] = useState(false);

  const handleInitialConfirm = () => {
    setCurrentStep('confirmation');
  };

  const handleFinalConfirm = async () => {
    if (!isChecked) {
      return;
    }

    setCurrentStep('deleting');
    try {
      await onConfirm();
      setCurrentStep('success');

      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset state for next use
        setCurrentStep('warning');
        setIsChecked(false);
      }, 2000);
    } catch (error) {
      // Reset to confirmation step on error
      setCurrentStep('confirmation');
      setIsChecked(false);
    }
  };

  const handleClose = () => {
    if (loading) return; // Don't allow closing during deletion

    onClose();
    // Reset state for next use
    setCurrentStep('warning');
    setIsChecked(false);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'warning':
        return '¿Eliminar Anuncio Permanentemente?';
      case 'confirmation':
        return 'Confirmar Eliminación Definitiva';
      case 'deleting':
        return 'Eliminando Permanentemente...';
      case 'success':
        return '¡Eliminado Permanentemente!';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'warning':
        return 'Esta acción es IRREVERSIBLE y eliminará permanentemente el anuncio y todos sus datos asociados.';
      case 'confirmation':
        return 'Marca la casilla de confirmación para proceder con la eliminación permanente. Se eliminarán todas las conversaciones de chat asociadas.';
      case 'deleting':
        return 'Eliminando permanentemente el anuncio y todos los datos asociados...';
      case 'success':
        return 'El anuncio ha sido eliminado permanentemente de la base de datos.';
      default:
        return '';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'warning':
        return (
          <div className="space-y-4">
            <Alert className="border-red-600 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-700" />
              <AlertDescription className="text-red-800">
                <strong>ADVERTENCIA CRÍTICA:</strong> Esta acción eliminará PERMANENTEMENTE:
              </AlertDescription>
            </Alert>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-gray-700">
              <ul className="space-y-3 text-sm text-gray-900 dark:text-white">
                <li className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 dark:text-white">El anuncio: <strong className="text-red-700 dark:text-red-400">"{listing.title}"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 dark:text-white">Todo el historial de chat asociado</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileImage className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 dark:text-white">Las imágenes y archivos multimedia</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 dark:text-white">Cualquier transacción asociada</span>
                </li>
              </ul>
            </div>

            <Alert className="border-red-800 bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-900" />
              <AlertDescription className="text-red-900 font-bold">
                ⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER ⚠️
                <br />
                El anuncio será eliminado permanentemente de la base de datos.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'confirmation':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Para confirmar la eliminación permanente del anuncio, marca la siguiente casilla:
              </p>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                  disabled={loading}
                  data-testid="hard-delete-confirmation-checkbox"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white select-none">
                  <strong>Deseo eliminar definitivamente este anuncio</strong> y comprendo que esta acción es irreversible y eliminará todas las conversaciones de chat asociadas.
                </span>
              </label>
            </div>

            <Alert className="border-red-600 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-700" />
              <AlertDescription className="text-red-800">
                <strong>ÚLTIMA ADVERTENCIA:</strong> Una vez eliminado, no hay forma de recuperar el anuncio o sus datos asociados.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'deleting':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Eliminando permanentemente...</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Esta acción es irreversible</p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">¡Anuncio eliminado permanentemente!</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Todos los datos asociados han sido eliminados</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepActions = () => {
    switch (currentStep) {
      case 'warning':
        return (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInitialConfirm}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Entiendo, continuar
            </Button>
          </div>
        );

      case 'confirmation':
        return (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleFinalConfirm}
              disabled={!isChecked || loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Eliminando Permanentemente...' : 'Eliminar Permanentemente'}
            </Button>
          </div>
        );

      case 'deleting':
        return null; // No actions during deletion

      case 'success':
        return null; // No actions needed after success

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-700">
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderStepContent()}
        </div>

        {getStepActions() && (
          <div className="flex gap-3 pt-4 border-t">
            {getStepActions()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}