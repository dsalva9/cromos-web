import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface TemplateSlot {
  id: string;
  slot_number: number;
  label: string | null;
  is_special: boolean;
}

export interface TemplatePage {
  id: string;
  page_number: number;
  title: string;
  type: 'team' | 'special';
  slots_count: number;
  slots: TemplateSlot[];
}

export interface TemplateDetails {
  id: string;
  author_id: string;
  author_nickname: string;
  title: string;
  description: string | null;
  image_url: string | null;
  is_public: boolean;
  rating_avg: number;
  rating_count: number;
  copies_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateDetailsResponse {
  template: TemplateDetails;
  pages: TemplatePage[];
}

export function useTemplateDetails(templateId: string) {
  const [data, setData] = useState<TemplateDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTemplateDetails() {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data: result, error: rpcError } = await supabase.rpc(
          'get_template_details',
          { p_template_id: parseInt(templateId) }
        );

        if (rpcError) throw rpcError;

        setData(result as TemplateDetailsResponse);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch template details'));
      } finally {
        setLoading(false);
      }
    }

    if (templateId) {
      fetchTemplateDetails();
    }
  }, [templateId]);

  return { data, loading, error };
}
