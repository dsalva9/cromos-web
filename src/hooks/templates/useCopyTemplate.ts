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
        p_custom_title: customTitle || null,
      });

      if (error) {
        // Handle 404/400 errors gracefully - RPC doesn't exist yet
        throw new Error(
          'Las plantillas no están disponibles todavía. Próximamente en Sprint 9.'
        );
      }
      if (!data) throw new Error('No se devolvió ningún ID de copia');

      return data.toString();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { copyTemplate, loading };
}
