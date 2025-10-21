'use client';

import { useState } from 'react';
import { useTemplates } from '@/hooks/templates/useTemplates';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateFilters } from '@/components/templates/TemplateFilters';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/components/providers/SupabaseProvider';

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
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-white mb-2">
              Plantillas Comunitarias
            </h1>
            <p className="text-gray-400">
              Descubre y copia plantillas de colección creadas por la comunidad
            </p>
          </div>

          {user && (
            <Link href="/templates/create">
              <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700]">
                <Plus className="mr-2 h-4 w-4" />
                Crear Plantilla
              </Button>
            </Link>
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

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {templates.map(template => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-8">
            <Button onClick={loadMore} variant="outline">
              Cargar Más
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && templates.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">
              No se encontraron plantillas
            </p>
            {user && (
              <Link href="/templates/create">
                <Button className="bg-[#FFC000] text-black">
                  Crear la primera plantilla
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
