'use client';

import { useState, useRef, useCallback } from 'react';
import { useTemplates } from '@/hooks/templates/useTemplates';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateFilters } from '@/components/templates/TemplateFilters';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/components/providers/SupabaseProvider';
import { Template } from '@/lib/templates/server-templates';
import { TemplateCardSkeleton } from '@/components/skeletons/TemplateCardSkeleton';

interface TemplatesContentProps {
    initialTemplates: Template[];
}

type SortOption = 'recent' | 'rating' | 'popular';

export function TemplatesContent({ initialTemplates }: TemplatesContentProps) {
    const { user } = useUser();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [localTemplates, setLocalTemplates] = useState<Template[]>(initialTemplates);
    const [isUsingServerData, setIsUsingServerData] = useState(true);

    // We only use the hook for subsequent fetches (search, sort, load more)
    // Initially we display server data
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
    });

    // When search or sort changes, we switch to client-side data
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setIsUsingServerData(false);
    };

    const handleSortChange = (value: SortOption) => {
        setSortBy(value);
        setIsUsingServerData(false);
    };

    // Decide which templates to show
    // If we haven't touched filters, use initial server data + any loaded more data
    // But useTemplates hook handles its own state, so simpler approach:
    // If search/sort are default AND we haven't loaded more, favor server data to avoid hydration mismatch/flicker?
    // Actually, useTemplates will fetch on mount. We want to avoid that double fetch if possible.
    // BUT useTemplates has a useEffect that triggers fetch.
    // Standard pattern: Pass initialData to hook if supported, or just let hook take over.
    // Since useTemplates doesn't support initialData yet, we'll let it fetch but show initialData while loading.

    // Revised approach:
    // We can't easily patch useTemplates without modifying it.
    // For now, we'll display initialTemplates until the hook finishes its first load.
    // Better yet, modifying useTemplates to accept initialData would be cleaner, but standard migration:
    // 1. Show initialTemplates
    // 2. Hook wakes up, fetches same data (cache hit hopefully or fast), then updates.
    // To avoid flicker we just sync them.

    const displayTemplates = isUsingServerData && searchQuery === '' && sortBy === 'recent'
        ? initialTemplates
        : fetchedTemplates;

    // Ideally we should sync the hook's state with initial data to avoid immediate re-fetch
    // For this first pass, we accept the double-fetch behavior on navigation (client cache might help)
    // or we can optimize useTemplates later.

    // NOTE: A better pattern is to pass initialData to the hook.
    // Let's rely on the hook's data once it loads.

    const showLoading = loading && displayTemplates.length === 0;
    // If we are using server data, we are "not loading" in users eyes even if hook is hydrating
    const effectiveLoading = isUsingServerData ? false : loading;

    // Sync effect: once hook loads, we switch to it?
    // Actually, if we just render initialTemplates, the hook will eventually update `fetchedTemplates`.
    // If they enter the page, `loading` is true initially in the hook.
    // So we show `initialTemplates`.
    // When hook finishes, `loading` becomes false, `fetchedTemplates` is populated.
    // We switch to `fetchedTemplates`.
    // If data is identical, no visual change.

    const currentTemplates = (loading && displayTemplates.length === 0) ? [] : (fetchedTemplates.length > 0 ? fetchedTemplates : initialTemplates);

    // Logic refinement for smooth transition:
    // 1. Initial render: loading=true (hook), but we have initialTemplates. Show initialTemplates.
    // 2. Hook completes: loading=false, fetchedTemplates has data. Show fetchedTemplates.
    // 3. User fliters: loading=true, fetchedTemplates clears? or keeps old?
    // The useTemplates hook clears on new search.

    const activeTemplates = (loading && fetchedTemplates.length === 0 && searchQuery !== '')
        ? []
        : (fetchedTemplates.length > 0 || !isUsingServerData ? fetchedTemplates : initialTemplates);

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
                                Mis Colecciones
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

            {error && !isUsingServerData && (
                <div className="text-red-500 text-center py-8">
                    Error al cargar colecciones: {error}
                </div>
            )}

            {/* Loading State - only when we have NO data to show */}
            {effectiveLoading && activeTemplates.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TemplateCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Templates Grid */}
            {activeTemplates.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {activeTemplates.map((template, index) => (
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
            {loading && activeTemplates.length > 0 && (
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
            {!loading && activeTemplates.length === 0 && (
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
