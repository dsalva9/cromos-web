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

interface DeleteListingModalProps {
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

type Step = 'warning' | 'deleting' | 'success';

export function DeleteListingModal({
  isOpen,
  onClose,
  onConfirm,
  listing,
  loading = false
}: DeleteListingModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('warning');

  const handleConfirm = async () => {
    setCurrentStep('deleting');
    try {
      await onConfirm();
      setCurrentStep('success');

      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset state for next use
        setCurrentStep('warning');
      }, 2000);
    } catch (error) {
      // Reset to warning step on error
      setCurrentStep('warning');
    }
  };

  const handleClose = () => {
    if (loading) return; // Don't allow closing during deletion

    onClose();
    // Reset state for next use
    setCurrentStep('warning');
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'warning':
        return '¿Eliminar Anuncio?';
      case 'deleting':
        return 'Eliminando...';
      case 'success':
        return '¡Eliminado!';
      default:
        return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'warning':
        return 'El anuncio será movido a la sección "Eliminados" donde podrás verlo y restaurarlo durante los próximos 30 días.';
      case 'deleting':
        return 'Moviendo el anuncio a la sección "Eliminados"...';
      case 'success':
        return 'El anuncio ha sido movido a "Eliminados". Podrás restaurarlo durante los próximos 30 días.';
      default:
        return '';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'warning':
        return (
          <div className="space-y-4">
            <Alert className="border-blue-500 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Eliminación Temporal:</strong> Este anuncio será movido a la sección "Eliminados"
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
              <p className="text-sm text-gray-700 font-medium">
                Se eliminará temporalmente el anuncio:
              </p>
              <div className="ml-2 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-blue-500" />
                  <span><strong>"{listing.title}"</strong></span>
                </div>
              </div>
            </div>

            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Puedes restaurarlo:</strong> El anuncio permanecerá en la sección "Eliminados" durante 30 días.
                Durante este tiempo, podrás verlo y restaurarlo cuando quieras. Las conversaciones de chat se mantendrán intactas.
              </AlertDescription>
            </Alert>

            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Eliminación automática:</strong> Pasados 30 días, el anuncio será eliminado permanentemente de forma automática junto con todas sus conversaciones.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'deleting':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
              <p className="text-gray-600">Eliminando anuncio...</p>
              <p className="text-sm text-gray-500">Esto puede tardar unos segundos</p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
              <p className="text-gray-700 font-medium">¡Anuncio eliminado correctamente!</p>
              <p className="text-sm text-gray-500">Todos los datos asociados han sido eliminados</p>
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
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Moviendo a Eliminados...' : 'Mover a Eliminados'}
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
          <DialogTitle className="text-xl font-bold">
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