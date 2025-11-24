'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTemplateProgress } from '@/hooks/templates/useTemplateProgress';
import { TemplateProgressGrid } from '@/components/templates/TemplateProgressGrid';
import { TemplateSummaryHeader } from '@/components/templates/TemplateSummaryHeader';
import { QuickEntryModal } from '@/components/templates/QuickEntryModal';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

function TemplateProgressContent() {
  const params = useParams();
  const router = useRouter();
  const copyId = params.copyId as string;
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { copy, progress, loading, error, updateSlotStatus, deleteTemplateCopy } =
    useTemplateProgress(copyId);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteTemplateCopy();
      toast.success('Colección eliminada correctamente');
      router.push('/mis-plantillas');
    } catch (err) {
      toast.error('Error al eliminar la colección');
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  if (error || !copy) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Colección no encontrada</p>
          <Link href="/mis-plantillas">
            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700]">Volver a Mis Álbumes</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if template has global numbers
  const hasGlobalNumbers = progress.some(slot => slot.global_number !== null);

  return (
    <div className="min-h-screen bg-[#1F2937] pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Back and Quick Entry */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <Link href="/mis-plantillas" className="w-full sm:w-auto">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-800 pl-0 sm:pl-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Mis Álbumes
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Quick Entry Button - Only show if template has global numbers */}
            {hasGlobalNumbers && (
              <Button
                onClick={() => setQuickEntryOpen(true)}
                className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold w-full sm:w-auto shadow-lg shadow-[#FFC000]/20 transition-all hover:scale-105"
              >
                <Zap className="mr-2 h-4 w-4" />
                Entrada Rápida
              </Button>
            )}

            {/* Delete Button */}
            <Button
              onClick={() => setDeleteDialogOpen(true)}
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 w-full sm:w-auto hidden sm:inline-flex border border-transparent hover:border-red-900/50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>

        {/* Summary Header */}
        <TemplateSummaryHeader copy={copy} progress={progress} />

        {/* Progress Grid */}
        <TemplateProgressGrid
          progress={progress}
          onUpdateSlot={updateSlotStatus}
          copyId={copyId}
        />

        {/* Mobile Delete Button */}
        <div className="mt-12 sm:hidden border-t border-gray-800 pt-8">
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            variant="ghost"
            className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20 border border-gray-800"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar colección
          </Button>
        </div>

        {/* Quick Entry Modal */}
        <QuickEntryModal
          open={quickEntryOpen}
          onOpenChange={setQuickEntryOpen}
          copyTitle={copy.title}
          slots={progress}
          onUpdateProgress={async (slotId, status, count = 0) => {
            await updateSlotStatus(slotId, status, count);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-800 shadow-2xl shadow-black/50">
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center gap-3">
                <div className="bg-red-500/10 p-2 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                ¿Eliminar colección?
              </DialogTitle>
              <DialogDescription className="text-gray-400 pt-4">
                Esta acción no se puede deshacer. Perderás todo el progreso
                registrado para esta colección.
                <div className="mt-4 bg-red-900/20 border border-red-900/50 rounded-lg p-3 text-red-200 text-sm">
                  <strong>Nota:</strong> Los anuncios en el mercado no se verán afectados por esta acción.
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Colección'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function TemplateProgressPage() {
  return (
    <AuthGuard>
      <TemplateProgressContent />
    </AuthGuard>
  );
}
