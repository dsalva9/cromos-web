'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTemplateDetails } from '@/hooks/templates/useTemplateDetails';
import { useUser } from '@/components/providers/SupabaseProvider';
import { TemplateCreationWizard } from '@/components/templates/TemplateCreationWizard';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const templateId = params.id as string;
  const supabase = createClient();

  const { data, loading, error } = useTemplateDetails(templateId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is owner
  useEffect(() => {
    if (data?.template && user && data.template.author_id !== user.id) {
      toast.error('No tienes permiso para editar esta plantilla');
      router.push(`/templates/${templateId}`);
    }
  }, [data, user, templateId, router]);

  const handleSubmit = async (formData: {
    title: string;
    description: string;
    image_url: string;
    is_public: boolean;
    item_schema?: Array<{
      name: string;
      type: 'text' | 'number' | 'checkbox' | 'select';
      required: boolean;
      options?: string[];
    }>;
    pages: Array<{
      title: string;
      type: 'team' | 'special';
      slots: Array<{
        data: Record<string, string | number | boolean>;
      }>;
    }>;
  }) => {
    setIsSubmitting(true);

    try {
      // 1. Update template metadata
      const { error: metadataError } = await supabase
        .from('collection_templates')
        .update({
          title: formData.title,
          description: formData.description,
          image_url: formData.image_url || null,
          is_public: formData.is_public,
          item_schema: formData.item_schema || [],
        })
        .eq('id', Number(templateId));

      if (metadataError) throw metadataError;

      // 2. Delete all existing pages (and slots cascade)
      const { error: deletePagesError } = await supabase
        .from('template_pages')
        .delete()
        .eq('template_id', Number(templateId));

      if (deletePagesError) throw deletePagesError;

      // 3. Re-create all pages with new structure
      for (const [pageIndex, page] of formData.pages.entries()) {
        const { error: pageError } = await supabase.rpc(
          'add_template_page_v2',
          {
            p_template_id: parseInt(templateId),
            p_title: page.title,
            p_type: page.type,
            p_slots: page.slots,
          }
        );

        if (pageError) {
          logger.error(`Error creating page ${pageIndex}:`, pageError);
          throw pageError;
        }
      }

      toast.success('Colección actualizada con éxito');
      router.push(`/templates/${templateId}`);
    } catch (err) {
      logger.error('Error updating template:', err);
      toast.error(
        err instanceof Error ? err.message : 'Error al actualizar colección'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#FFC000] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">Error al cargar la plantilla</p>
          <Link href="/templates">
            <button className="px-4 py-2 bg-[#FFC000] text-black rounded">
              Volver a Colecciones
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Transform data to match wizard format
  const initialData = {
    title: data.template.title,
    description: data.template.description || '',
    image_url: data.template.image_url || '',
    is_public: data.template.is_public,
    terms_accepted: data.template.is_public, // Already public means terms were accepted
    item_schema: data.template.item_schema || [],
    pages: data.pages.map(page => ({
      title: page.title,
      type: page.type as 'team' | 'special',
      slots: page.slots.map(slot => {
        const slotData = { ...(slot.data || {}) };

        // Map label to Nombre if it's missing in data but present in schema
        const hasNombreField = data.template.item_schema?.some(f => f.name === 'Nombre' || f.name === 'nombre');
        if (slot.label && hasNombreField && !slotData['Nombre'] && !slotData['nombre']) {
          const fieldName = data.template.item_schema?.find(f => f.name === 'Nombre' || f.name === 'nombre')?.name || 'Nombre';
          slotData[fieldName] = slot.label;
        }

        // Map slot_number to Número if it's missing in data but present in schema
        const hasNumeroField = data.template.item_schema?.some(f => f.name === 'Número' || f.name === 'número' || f.name === 'Numero' || f.name === 'numero');
        if (slot.slot_number && hasNumeroField && !slotData['Número'] && !slotData['número'] && !slotData['Numero'] && !slotData['numero']) {
          const fieldName = data.template.item_schema?.find(f => f.name === 'Número' || f.name === 'número' || f.name === 'Numero' || f.name === 'numero')?.name || 'Número';
          slotData[fieldName] = slot.slot_number;
        }

        return {
          data: slotData,
        };
      }),
    })),
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <Link
            href={`/templates/${templateId}`}
            className="inline-flex items-center text-[#FFC000] hover:text-[#FFD700] mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la colección
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase text-gray-900 mb-2">
              Editar Colección
            </h1>
            <p className="text-gray-600">
              Modifica la información, páginas y cromos de tu colección
            </p>
          </div>

          {/* Use the creation wizard with initial data */}
          <TemplateCreationWizard
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            initialData={initialData}
            title="Editar Colección"
          />
        </div>
      </div>
    </AuthGuard>
  );
}
