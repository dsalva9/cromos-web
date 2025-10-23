'use client';

import { useParams } from 'next/navigation';
import { useTemplateProgress } from '@/hooks/templates/useTemplateProgress';
import { TemplateProgressGrid } from '@/components/templates/TemplateProgressGrid';
import { TemplateSummaryHeader } from '@/components/templates/TemplateSummaryHeader';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, List, Plus } from 'lucide-react';
import Link from 'next/link';

function TemplateProgressContent() {
  const params = useParams();
  const copyId = params.copyId as string;

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

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/mis-plantillas">
          <Button
            variant="ghost"
            className="mb-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Mis Colecciones
          </Button>
        </Link>

        {/* Summary Header */}
        <TemplateSummaryHeader copy={copy} progress={progress} />

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Link href="/marketplace/my-listings">
            <Button variant="outline" className="border-2 border-black text-white hover:bg-[#374151]">
              <List className="mr-2 h-4 w-4" />
              Ver Mis Anuncios
            </Button>
          </Link>

          <Link href="/marketplace/create">
            <Button variant="outline" className="border-2 border-black text-white hover:bg-[#374151]">
              <Plus className="mr-2 h-4 w-4" />
              Crear Anuncio Manual
            </Button>
          </Link>
        </div>

        {/* Progress Grid */}
        <TemplateProgressGrid
          progress={progress}
          onUpdateSlot={updateSlotStatus}
          copyId={copyId}
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
