import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

export function useCopyTemplate() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const copyTemplate = async (
    templateId: string,
    customTitle?: string
  ): Promise<string> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('copy_template', {
        p_template_id: parseInt(templateId),
        p_custom_title: customTitle || undefined,
      });

      if (error) {
        const code = (error as { code?: string; message?: string }).code;
        const message = (error as { code?: string; message?: string }).message || '';
        if (code === '23505' || message.toLowerCase().includes('duplicate')) {
          throw new Error('Ya has copiado esta colección.');
        }
        throw new Error(message || 'Error al copiar la colección.');
      }

      if (!data) {
        throw new Error('No se devolvió ningún ID de copia');
      }

      return data.toString();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { copyTemplate, loading };
}
