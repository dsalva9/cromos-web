import { useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface TemplateSlotData {
  data: Record<string, string | number | boolean>;
}

interface TemplatePageData {
  title: string;
  type: 'team' | 'special';
  slots: TemplateSlotData[];
}

interface TemplateData {
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
  pages: TemplatePageData[];
}

export function useCreateTemplate() {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTemplate = async (templateData: TemplateData) => {
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!templateData.title.trim()) {
        throw new Error('El título es obligatorio');
      }

      if (templateData.pages.length === 0) {
        throw new Error('Debe añadir al menos una página');
      }

      // Create a deep copy and filter out empty pages
      const processedData = {
        ...templateData,
        pages: templateData.pages.filter(
          page => page.title.trim() !== '' && page.slots.length > 0
        ),
      };

      if (processedData.pages.length === 0) {
        throw new Error('Debe añadir al menos una página con cromos válidos');
      }

      // Step 1: Create template
      const { data: template, error: templateError } = await supabase.rpc(
        'create_template',
        {
          p_title: processedData.title.trim(),
          p_description: processedData.description.trim() || null,
          p_image_url: processedData.image_url.trim() || null,
          p_is_public: processedData.is_public,
          p_item_schema: processedData.item_schema || [],
        }
      );

      if (templateError) {
        logger.error('Template creation error:', templateError);
        throw new Error(templateError.message || 'Error al crear la plantilla');
      }

      const templateId = template;

      // Step 2: Add pages with slots
      for (const page of processedData.pages) {
        // Ensure slots is an array and convert to JSON string
        const slotsArray = Array.isArray(page.slots) ? page.slots : [];
        const slotsJson = JSON.stringify(slotsArray);

        logger.debug('Sending slots data:', {
          page: page.title,
          slotsCount: slotsArray.length,
          slotsArray,
          slotsJson,
        });

        const { error: pageError } = await supabase.rpc(
          'add_template_page_v2', // Use the new RPC with better JSON handling
          {
            p_template_id: templateId,
            p_title: page.title.trim(),
            p_type: page.type,
            p_slots: slotsArray, // Send as array, let the new RPC handle it
          }
        );

        if (pageError) {
          logger.error('Page creation error:', pageError);
          logger.error('Slots data that caused error:', slotsArray);
          logger.error('Slots JSON that caused error:', slotsJson);
          throw new Error(
            pageError.message || `Error al añadir la página "${page.title}"`
          );
        }
      }

      // Step 3: Publish template
      const { error: publishError } = await supabase.rpc('publish_template', {
        p_template_id: templateId,
        p_is_public: processedData.is_public,
      });

      if (publishError) {
        logger.error('Publish error:', publishError);
        throw new Error(
          publishError.message || 'Error al publicar la plantilla'
        );
      }

      // Step 4: Automatically copy the template to the user's collection
      const { error: copyError } = await supabase.rpc('copy_template', {
        p_template_id: templateId,
        p_custom_title: processedData.title // Use the same title for the copy
      });

      if (copyError) {
        logger.error('Error auto-copying template:', copyError);
        // We don't throw here to avoid failing the whole creation process if just the copy fails
      }

      toast.success('¡Plantilla creada con éxito!');

      return templateId;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Error desconocido al crear la plantilla';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createTemplate,
    loading,
    error,
  };
}
