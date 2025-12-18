'use client';

import { useState } from 'react';
import { useTemplates } from '@/hooks/templates/useTemplates';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateFilters } from '@/components/templates/TemplateFilters';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/components/providers/SupabaseProvider';
import { TemplateCardSkeleton } from '@/components/skeletons/TemplateCardSkeleton';

type SortOption = 'recent' | 'rating' | 'popular';

export default function TemplatesPage() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const { templates, loading, error, hasMore, loadMore } = useTemplates({
    search: searchQuery,
    sortBy,
    limit: 12,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold uppercase text-gray-900 mb-2">
              Plantillas Comunitarias
            </h1>
            <p className="text-gray-600">
              Descubre y copia plantillas de colección creadas por la comunidad
            </p>
          </div>

          {user && (
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Link href="/templates/my-templates" className="w-full sm:w-auto">
                <Button variant="outline" className="border-[#FFC000] text-[#FFC000] hover:bg-[#FFC000] hover:text-black font-medium w-full">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Mis Plantillas
                </Button>
              </Link>
              <Link href="/templates/create" className="hidden md:block w-full sm:w-auto">
                <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Plantilla
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <TemplateFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            Error al cargar plantillas: {error}
          </div>
        )}

        {/* Initial Loading */}
        {loading && templates.length === 0 && (
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
                <TemplateCard template={template} />
              </div>
            ))}
          </div>
        )}

        {/* Loading More State */}
        {loading && templates.length > 0 && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-8">
            <Button onClick={loadMore} variant="outline">
              Cargar más
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && templates.length === 0 && (
          <EmptyState
            icon={FolderOpen}
            title="No se encontraron plantillas"
            description={
              searchQuery
                ? 'No hay plantillas que coincidan con tu búsqueda. Intenta con otros términos o crea una nueva plantilla.'
                : 'Todavía no hay plantillas comunitarias. ¡Sé el primero en crear una!'
            }
            actionLabel={user ? 'Crear la primera plantilla' : undefined}
            actionHref={user ? '/templates/create' : undefined}
          />
        )}
      </div>
    </div>
  );
}
