'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { SimplifiedListingForm } from '@/components/marketplace/SimplifiedListingForm';
import { usePublishDuplicate } from '@/hooks/integration/usePublishDuplicate';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

function PublishDuplicateContent() {
  const params = useParams();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const copyId = params.copyId as string;
  const slotId = params.slotId as string;

  interface SlotData {
    slot_id: string | number;
    label: string | null;
    status: string;
    count: number;
    slot_number: number;
    slot_variant: string | null;
    global_number: number | null;
    page_number: number;
    page_title: string | null;
    data: Record<string, string | number | boolean> | null;
  }

  interface TemplateInfo {
    title: string;
    item_schema: Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
    }>;
  }

  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { publishDuplicate, loading: publishing } = usePublishDuplicate();

  const fetchSlotData = useCallback(async () => {
    try {
      // Get template copy info
      const { data: copyData, error: copyError } = await supabase.rpc(
        'get_my_template_copies'
      );

      if (copyError) {
        logger.error('RPC error fetching copies:', copyError);
        throw copyError;
      }

      const currentCopy = copyData?.find(
        (c: { copy_id: number | string }) => c.copy_id === parseInt(copyId)
      );

      if (!currentCopy) {
        toast.error('Plantilla no encontrada');
        router.back();
        return;
      }

      // Get template details to fetch item_schema
      const { data: templateDetails, error: templateError } = await supabase.rpc(
        'get_template_details',
        { p_template_id: currentCopy.template_id }
      );

      if (templateError) {
        logger.error('Error fetching template details:', templateError);
      }

      setTemplateInfo({
        title: currentCopy.title,
        item_schema: (templateDetails as any)?.template?.item_schema || []
      });

      // Get slot info for pre-filling
      const { data: progressData, error } = await supabase.rpc('get_template_progress', {
        p_copy_id: parseInt(copyId)
      });

      if (error) {
        logger.error('RPC error:', error);
        throw error;
      }

      // Compare slot_id as both string and number since it comes from URL params
      const slot = progressData?.find((s: any) => {
        const sIdStr = String(s.slot_id);
        return sIdStr === slotId;
      });

      if (!slot) {
        toast.error('Cromo no encontrado');
        router.back();
        return;
      }

      if (slot.status !== 'duplicate') {
        toast.error(`Este cromo está marcado como "${slot.status}", no como "repetido"`);
        router.back();
        return;
      }

      if (slot.count < 2) {
        toast.error(`Necesitas al menos 2 cromos para publicar (tienes ${slot.count})`);
        router.back();
        return;
      }

      setSlotData(slot as SlotData);
    } catch (err) {
      logger.error('Failed to load slot data:', err);
      toast.error('Error al cargar datos del cromo');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [supabase, copyId, slotId, router]);

  useEffect(() => {
    fetchSlotData();
  }, [fetchSlotData]);

  const handlePublish = async (formData: {
    title: string;
    description?: string;
    image_url?: string;
  }) => {
    try {
      const listingId = await publishDuplicate(
        parseInt(copyId),
        parseInt(slotId),
        {
          title: formData.title,
          description: formData.description,
          image_url: formData.image_url,
          collection_name: templateInfo?.title || undefined,
        }
      );

      toast.success('¡Anuncio publicado correctamente!');
      router.push(`/marketplace/${listingId}`);
    } catch {
      toast.error('Error al publicar el anuncio');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Link href={`/mis-plantillas/${copyId}`}>
          <Button variant="ghost" className="mb-4 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la Colección
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black uppercase text-gray-900 mb-2">
            Publicar Repetido
          </h1>
          <p className="text-gray-600">
            Tienes {(slotData?.count || 1) - 1} {(slotData?.count || 1) - 1 === 1 ? 'repetido' : 'repetidos'} de este cromo
          </p>
        </div>

        {/* Form */}
        <SimplifiedListingForm
          initialData={{
            title: (() => {
              // Title: {Album Name} - {First Custom Field Value}
              const firstFieldValue = templateInfo?.item_schema?.[0]
                ? slotData?.data?.[templateInfo.item_schema[0].name]
                : null;
              return firstFieldValue
                ? `${templateInfo?.title} - ${firstFieldValue}`
                : slotData?.label || 'Cromo';
            })(),
            description: (() => {
              // Description: spare count + all custom fields
              const spareCount = (slotData?.count || 1) - 1;
              let desc = `Tengo ${spareCount} repetidos disponibles.`;

              // Add all custom fields
              if (templateInfo?.item_schema && slotData?.data) {
                const fields = templateInfo.item_schema
                  .map(field => {
                    const value = slotData.data?.[field.name];
                    return value !== undefined && value !== null && value !== ''
                      ? `${field.name}: ${value}`
                      : null;
                  })
                  .filter(Boolean);

                if (fields.length > 0) {
                  desc += '\n\n' + fields.join(', ');
                }
              }

              return desc;
            })(),
            image_url: undefined,
            is_group: false,
            collection_name: templateInfo?.title || '',
          }}
          onSubmit={handlePublish}
          loading={publishing}
          disablePackOption={true}
        />
      </div>
    </div>
  );
}

export default function PublishDuplicatePage() {
  return (
    <AuthGuard>
      <PublishDuplicateContent />
    </AuthGuard>
  );
}
