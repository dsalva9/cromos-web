'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ListingForm } from '@/components/marketplace/ListingForm';
import { usePublishDuplicate } from '@/hooks/integration/usePublishDuplicate';
import AuthGuard from '@/components/AuthGuard';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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
    page_title: string;
  }

  interface TemplateInfo {
    title: string;
  }

  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { publishDuplicate, loading: publishing } = usePublishDuplicate();

  const fetchSlotData = async () => {
    try {
      // Get template copy info
      const { data: copyData, error: copyError } = await supabase.rpc(
        'get_my_template_copies'
      );

      if (copyError) {
        console.error('RPC error fetching copies:', copyError);
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

      setTemplateInfo({ title: currentCopy.title });

      // Get slot info for pre-filling
      const { data: progressData, error } = await supabase.rpc('get_template_progress', {
        p_copy_id: parseInt(copyId)
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      // Compare slot_id as both string and number since it comes from URL params
      const slot = progressData?.find((s: SlotData) => {
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

      setSlotData(slot);
    } catch (err) {
      console.error('Failed to load slot data:', err);
      toast.error('Error al cargar datos del cromo');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyId, slotId]);

  const handlePublish = async (formData: {
    title: string;
    description?: string;
    sticker_number?: string;
    collection_name?: string;
    image_url?: string;
  }) => {
    try {
      const listingId = await publishDuplicate(
        parseInt(copyId),
        parseInt(slotId),
        formData
      );

      toast.success('¡Anuncio publicado correctamente!');
      router.push(`/marketplace/${listingId}`);
    } catch {
      toast.error('Error al publicar el anuncio');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Link href={`/mis-plantillas/${copyId}`}>
          <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la Colección
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Publicar Repetido
          </h1>
          <p className="text-gray-400">
            Tienes {slotData?.count} repetidos de este cromo
          </p>
        </div>

        {/* Info Card */}
        <ModernCard className="mb-6">
          <ModernCardContent className="p-4 bg-blue-900/20 border-2 border-blue-700">
            <p className="text-sm text-blue-200">
              <strong>Nota:</strong> Al publicar se creará un anuncio en el mercado.
              Puedes editar los detalles a continuación. Cuando alguien lo compre, tu
              contador de repetidos disminuirá automáticamente.
            </p>
          </ModernCardContent>
        </ModernCard>

        {/* Form */}
        <ListingForm
          initialData={{
            title: slotData?.label || 'Cromo',
            description: `Tengo ${(slotData?.count || 1) - 1} repetidos disponibles.`,
            sticker_number: slotData?.slot_number
              ? `${slotData.slot_number}${slotData.slot_variant || ''}`
              : '',
            collection_name: templateInfo?.title || '',
            image_url: '',
            // Panini metadata fields
            page_number: slotData?.page_number,
            page_title: slotData?.page_title || '',
            slot_variant: slotData?.slot_variant || '',
            global_number: slotData?.global_number ?? undefined,
          }}
          onSubmit={handlePublish}
          loading={publishing}
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
