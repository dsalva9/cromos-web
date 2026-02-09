'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/components/providers/SupabaseProvider';

export interface TemplateMetadata {
  title: string;
  description: string | null;
  image_url: string | null;
  is_public: boolean;
}

export function useTemplateEditor(templateId: string) {
  const supabase = createClient();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update template metadata
  const updateMetadata = useCallback(
    async (metadata: Partial<TemplateMetadata>) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para editar colecciones');
      }

      setLoading(true);
      try {
        const { error } = await supabase.rpc('update_template_metadata', {
          p_template_id: parseInt(templateId),
          p_title: metadata.title || undefined,
          p_description: metadata.description || undefined,
          p_image_url: metadata.image_url || undefined,
          p_is_public: metadata.is_public !== undefined ? metadata.is_public : undefined
        });

        if (error) {
          if (error.message.includes('do not have permission')) {
            throw new Error('No tienes permiso para editar esta colección');
          }
          throw error;
        }

        setHasUnsavedChanges(false);
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al actualizar colección');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase, templateId]
  );

  // Update a page
  const updatePage = useCallback(
    async (pageId: string, data: { title?: string; type?: string; page_number?: number }) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para editar páginas');
      }

      setLoading(true);
      try {
        const { error } = await supabase.rpc('update_template_page', {
          p_page_id: parseInt(pageId),
          p_title: data.title || undefined,
          p_type: data.type || undefined,
          p_page_number: data.page_number || undefined
        });

        if (error) throw error;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al actualizar página');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase]
  );

  // Delete a page
  const deletePage = useCallback(
    async (pageId: string) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para eliminar páginas');
      }

      setLoading(true);
      try {
        const { error } = await supabase.rpc('delete_template_page', {
          p_page_id: parseInt(pageId)
        });

        if (error) throw error;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al eliminar página');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase]
  );

  // Update a slot
  const updateSlot = useCallback(
    async (slotId: string, data: { label?: string; is_special?: boolean }) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para editar cromos');
      }

      setLoading(true);
      try {
        const { error } = await supabase.rpc('update_template_slot', {
          p_slot_id: parseInt(slotId),
          p_label: data.label || undefined,
          p_is_special: data.is_special !== undefined ? data.is_special : undefined
        });

        if (error) throw error;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al actualizar cromo');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase]
  );

  // Delete a slot
  const deleteSlot = useCallback(
    async (slotId: string) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para eliminar cromos');
      }

      setLoading(true);
      try {
        const { error } = await supabase.rpc('delete_template_slot', {
          p_slot_id: parseInt(slotId)
        });

        if (error) throw error;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al eliminar cromo');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase]
  );

  // Add a new page with slots
  const addPage = useCallback(
    async (data: { title: string; type: 'team' | 'special'; slots: Array<{ label: string; is_special: boolean }> }) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para añadir páginas');
      }

      setLoading(true);
      try {
        const { data: result, error } = await supabase.rpc('add_template_page_v2', {
          p_template_id: parseInt(templateId),
          p_title: data.title,
          p_type: data.type,
          p_slots: data.slots
        });

        if (error) throw error;
        return result;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al añadir página');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase, templateId]
  );

  // Add a slot to an existing page
  const addSlot = useCallback(
    async (pageId: string, data: { label: string; is_special: boolean }) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para añadir cromos');
      }

      setLoading(true);
      try {
        // Get the current max slot number for the page
        const { data: slots, error: fetchError } = await supabase
          .from('template_slots')
          .select('slot_number')
          .eq('page_id', parseInt(pageId))
          .order('slot_number', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        const nextSlotNumber = (slots && slots.length > 0) ? slots[0].slot_number + 1 : 1;

        // Get the page's template_id
        const { data: pageData, error: pageError } = await supabase
          .from('template_pages')
          .select('template_id')
          .eq('id', parseInt(pageId))
          .single();

        if (pageError || !pageData) throw pageError || new Error('Page not found');

        // Insert the new slot
        const { error } = await supabase
          .from('template_slots')
          .insert({
            template_id: pageData.template_id,
            page_id: parseInt(pageId),
            slot_number: nextSlotNumber,
            label: data.label,
            is_special: data.is_special
          });

        if (error) throw error;

        // Update the page's slots_count
        const { error: updateError } = await supabase
          .from('template_pages')
          .update({ slots_count: nextSlotNumber })
          .eq('id', parseInt(pageId));

        if (updateError) throw updateError;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al añadir cromo');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase]
  );

  // Delete entire template
  const deleteTemplate = useCallback(
    async (reason?: string) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para eliminar colecciones');
      }

      setLoading(true);
      try {
        const { error } = await supabase.rpc('delete_template', {
          p_template_id: parseInt(templateId),
          p_reason: reason || undefined
        });

        if (error) {
          if (error.message.includes('do not have permission')) {
            throw new Error('No tienes permiso para eliminar esta colección');
          }
          throw error;
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Error al eliminar colección');
      } finally {
        setLoading(false);
      }
    },
    [user, supabase, templateId]
  );

  return {
    loading,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    updateMetadata,
    updatePage,
    deletePage,
    addPage,
    updateSlot,
    deleteSlot,
    addSlot,
    deleteTemplate
  };
}
