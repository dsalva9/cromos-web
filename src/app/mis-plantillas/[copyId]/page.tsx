'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useTemplateProgress } from '@/hooks/templates/useTemplateProgress';
import { TemplateProgressGrid } from '@/components/templates/TemplateProgressGrid';
import { TemplateSummaryHeader } from '@/components/templates/TemplateSummaryHeader';
import { QuickEntryModal } from '@/components/templates/QuickEntryModal';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';

function TemplateProgressContent() {
  const params = useParams();
  const copyId = params.copyId as string;
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

  const { copy, progress, loading, error, updateSlotStatus } =
    useTemplateProgress(copyId);

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
            <Button>Volver a Mis Colecciones</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if template has global numbers
  const hasGlobalNumbers = progress.some(slot => slot.global_number !== null);

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Back and Quick Entry */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <Link href="/mis-plantillas" className="w-full sm:w-auto">
            <Button
              variant="ghost"
              className="text-gray-400 hover:text-white w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Mis Colecciones
            </Button>
          </Link>

          {/* Quick Entry Button - Only show if template has global numbers */}
          {hasGlobalNumbers && (
            <Button
              onClick={() => setQuickEntryOpen(true)}
              className="bg-[#FFC000] text-black hover:bg-[#FFD700] w-full sm:w-auto"
            >
              <Zap className="mr-2 h-4 w-4" />
              Entrada Rápida
            </Button>
          )}
        </div>

        {/* Summary Header */}
        <TemplateSummaryHeader copy={copy} progress={progress} />

        {/* Progress Grid */}
        <TemplateProgressGrid
          progress={progress}
          onUpdateSlot={updateSlotStatus}
          copyId={copyId}
        />

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
