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
          .select('id, title, description, image_url, is_public, created_at, author_id, rating_avg, rating_count, copies_count')
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

        // Transform the data
        const transformedData: Template[] = (templatesData || []).map((template) => {
          return {
            id: template.id.toString(),
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
          };
        });

        setTemplates(transformedData);
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar plantillas');
      } finally {
        setLoading(false);
      }
    };

    fetchMyTemplates();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <Link
          href="/templates"
          className="inline-flex items-center text-[#FFC000] hover:text-[#FFD700] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Plantillas
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold uppercase text-white mb-2">
              Mis Plantillas Creadas
            </h1>
            <p className="text-slate-300">
              Plantillas que has creado, públicas y privadas
            </p>
          </div>

          <Link href="/templates/create">
            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium">
              <Plus className="mr-2 h-4 w-4" />
              Crear Plantilla
            </Button>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            Error al cargar plantillas: {error}
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
            title="No has creado ninguna plantilla"
            description="Crea tu primera plantilla para compartirla con la comunidad o usarla de forma privada."
            actionLabel="Crear mi primera plantilla"
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
