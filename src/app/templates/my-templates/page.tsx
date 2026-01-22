'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/components/providers/SupabaseProvider';
import { createClient } from '@/lib/supabase/client';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TemplateCardSkeleton } from '@/components/skeletons/TemplateCardSkeleton';
import AuthGuard from '@/components/AuthGuard';

interface Template {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  is_public: boolean;
  rating_avg: number;
  rating_count: number;
  copies_count: number;
  pages_count: number;
  total_slots: number;
  created_at: string;
  author_id: string;
  author_nickname: string;
  deleted_at?: string | null;
  scheduled_for?: string | null;
}

function MyCreatedTemplatesContent() {
  const { user } = useUser();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchMyTemplates = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        // Fetch templates created by the logged-in user
        const { data: templatesData, error: fetchError } = await supabase
          .from('collection_templates')
          .select('id, title, description, image_url, is_public, created_at, author_id, rating_avg, rating_count, copies_count, deleted_at')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // Fetch user's nickname separately
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single();

        const userNickname = profileData?.nickname || 'Usuario';

        // Fetch retention schedule for deleted templates
        const deletedTemplateIds = (templatesData || [])
          .filter(t => t.deleted_at)
          .map(t => t.id.toString());

        let scheduleMap: Record<string, string> = {};
        if (deletedTemplateIds.length > 0) {
          const { data: scheduleData } = await supabase
            .from('retention_schedule')
            .select('entity_id, scheduled_for')
            .eq('entity_type', 'template')
            .in('entity_id', deletedTemplateIds)
            .is('processed_at', null);

          scheduleMap = (scheduleData || []).reduce((acc, item) => {
            acc[item.entity_id] = item.scheduled_for;
            return acc;
          }, {} as Record<string, string>);
        }

        // Transform the data
        const transformedData: Template[] = (templatesData || []).map((template) => {
          const templateId = template.id.toString();
          return {
            id: templateId,
            title: template.title,
            description: template.description,
            image_url: template.image_url,
            is_public: template.is_public,
            rating_avg: template.rating_avg || 0,
            rating_count: template.rating_count || 0,
            copies_count: template.copies_count || 0,
            pages_count: 0, // Could be fetched if needed
            total_slots: 0, // Could be fetched if needed
            created_at: template.created_at,
            author_id: template.author_id,
            author_nickname: userNickname,
            deleted_at: template.deleted_at,
            scheduled_for: scheduleMap[templateId] || null,
          };
        });

        setTemplates(transformedData);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar colecciones');
      } finally {
        setLoading(false);
      }
    };

    fetchMyTemplates();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <Link
          href="/templates"
          className="inline-flex items-center text-[#FFC000] hover:text-[#FFD700] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Colecciones
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold uppercase text-gray-900 mb-2">
              Mis Colecciones Creadas
            </h1>
            <p className="text-gray-600">
              Colecciones que has creado, públicas y privadas
            </p>
          </div>

          <Link href="/templates/create">
            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium">
              <Plus className="mr-2 h-4 w-4" />
              Crear Colección
            </Button>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            Error al cargar colecciones: {error}
          </div>
        )}

        {/* Initial Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <TemplateCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Templates Grid */}
        {!loading && templates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TemplateCard template={template} showVisibility={true} showEditButton={true} />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && templates.length === 0 && (
          <EmptyState
            icon={FolderOpen}
            title="No has creado ninguna colección"
            description="Crea tu primera colección para compartirla con la comunidad o usarla de forma privada."
            actionLabel="Crear mi primera colección"
            actionHref="/templates/create"
          />
        )}
      </div>
    </div>
  );
}

export default function MyCreatedTemplatesPage() {
  return (
    <AuthGuard>
      <MyCreatedTemplatesContent />
    </AuthGuard>
  );
}
