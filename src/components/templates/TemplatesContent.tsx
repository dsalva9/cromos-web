'use client';

import { useState, useRef, useCallback } from 'react';
import { useTemplates } from '@/hooks/templates/useTemplates';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateFilters } from '@/components/templates/TemplateFilters';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Loader2, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { ContextualTip } from '@/components/ui/ContextualTip';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/components/providers/SupabaseProvider';
import { Template } from '@/lib/templates/server-templates';
import { TemplateCardSkeleton } from '@/components/skeletons/TemplateCardSkeleton';

interface TemplatesContentProps {
    initialTemplates: Template[];
}

type SortOption = 'recent' | 'rating' | 'popular';

export function TemplatesContent({ initialTemplates }: TemplatesContentProps) {
    const { user } = useUser();
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || '';
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [sortBy, setSortBy] = useState<SortOption>('recent');

    // Pass server data as initialData - hook will skip initial fetch if filters are at defaults
    const {
        templates: fetchedTemplates,
        loading,
        error,
        hasMore,
        loadMore
    } = useTemplates({
        search: searchQuery,
        sortBy,
        limit: 12,
        initialData: initialTemplates,
    });

    // Simple handlers - hook manages all state now
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
    };

    const handleSortChange = (value: SortOption) => {
        setSortBy(value);
    };

    // Hook now initializes with server data, so just use fetchedTemplates directly
    // It will have initialTemplates on first render, then update on filter changes

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold uppercase text-gray-900 dark:text-white mb-2">
                        Colecciones Comunitarias
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Descubre y copia colecciones creadas por la comunidad
                    </p>
                </div>

                {user && (
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <Link href="/templates/my-templates" className="w-full sm:w-auto">
                            <Button variant="outline" className="border-[#FFC000] text-[#FFC000] hover:bg-[#FFC000] hover:text-black font-medium w-full">
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Mis Colecciones Creadas
                            </Button>
                        </Link>
                        <Link href="/templates/create" className="hidden md:block w-full sm:w-auto">
                            <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-medium w-full">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Colección
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <TemplateFilters
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                sortBy={sortBy}
                onSortChange={handleSortChange}
            />

            <ContextualTip
                tipId="tip-templates"
                icon={Lightbulb}
                title="¿Qué son las colecciones?"
                description="Las colecciones son plantillas creadas por la comunidad. Copia una para crear tu propio álbum y llevar el control de los cromos que tienes, los que te faltan y los repetidos."
                className="mt-6"
            />

            {error && (
                <div className="text-red-500 text-center py-8">
                    Error al cargar colecciones: {error}
                </div>
            )}

            {/* Loading State - only when we have NO data to show */}
            {loading && fetchedTemplates.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TemplateCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Templates Grid */}
            {fetchedTemplates.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {fetchedTemplates.map((template: Template, index: number) => (
                        <div
                            key={template.id}
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <TemplateCard template={template as any} />
                        </div>
                    ))}
                </div>
            )}

            {/* Loading More Spinner */}
            {loading && fetchedTemplates.length > 0 && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 text-[#FFC000] animate-spin" />
                </div>
            )}

            {/* Load More Button */}
            {hasMore && !loading && (
                <div className="flex justify-center mt-8">
                    <Button onClick={loadMore} variant="outline">
                        Cargar más
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {!loading && fetchedTemplates.length === 0 && (
                <EmptyState
                    icon={FolderOpen}
                    title="No se encontraron colecciones"
                    description={
                        searchQuery
                            ? 'No hay colecciones que coincidan con tu búsqueda. Intenta con otros términos o crea una nueva colección.'
                            : 'Todavía no hay colecciones comunitarias. ¡Sé el primero en crear una!'
                    }
                    actionLabel={user ? 'Crear la primera colección' : undefined}
                    actionHref={user ? '/templates/create' : undefined}
                />
            )}
        </>
    );
}
