'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';
import { useUserCollections } from '@/hooks/templates/useUserCollections';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface CollectionFilterProps {
  selectedCollectionIds: number[];
  onSelectionChange: (collectionIds: number[]) => void;
}

/**
 * CollectionFilter Component
 *
 * Multi-select filter for marketplace listings by user's collections.
 * Displays user's template copies as checkboxes in a popover.
 *
 * @param selectedCollectionIds - Currently selected collection IDs
 * @param onSelectionChange - Callback when selection changes
 *
 * @example
 * ```tsx
 * const [selectedIds, setSelectedIds] = useState<number[]>([]);
 *
 * <CollectionFilter
 *   selectedCollectionIds={selectedIds}
 *   onSelectionChange={setSelectedIds}
 * />
 * ```
 */
export function CollectionFilter({
  selectedCollectionIds,
  onSelectionChange,
}: CollectionFilterProps) {
  const { collections, loading, error } = useUserCollections();
  const [open, setOpen] = useState(false);

  const hasActiveFilters = selectedCollectionIds.length > 0;

  const toggleCollection = (collectionId: number) => {
    if (selectedCollectionIds.includes(collectionId)) {
      onSelectionChange(
        selectedCollectionIds.filter(id => id !== collectionId)
      );
    } else {
      onSelectionChange([...selectedCollectionIds, collectionId]);
    }
  };

  const clearFilters = () => {
    onSelectionChange([]);
  };

  const selectAll = () => {
    const allIds = collections.map(col => col.copy_id);
    onSelectionChange(allIds);
  };

  const isAllSelected =
    collections.length > 0 &&
    selectedCollectionIds.length === collections.length;

  // Don't render if user has no collections
  if (!loading && collections.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`border-2 border-black text-gray-900 hover:bg-gray-50 font-bold ${
              hasActiveFilters ? 'bg-[#FFC000] text-black hover:bg-[#FFD700]' : ''
            }`}
          >
            <Filter className="mr-2 h-4 w-4" />
            Mis Colecciones
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="ml-2 bg-black text-white px-1.5 py-0 text-xs"
              >
                {selectedCollectionIds.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 bg-white border-2 border-black text-gray-900"
          align="start"
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h4 className="font-bold text-sm uppercase">
                Filtrar por Colección
              </h4>
              <div className="flex gap-1">
                {!isAllSelected && collections.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="h-auto p-1 text-xs text-[#FFC000] hover:text-[#FFD700] hover:bg-gray-100"
                  >
                    Todas
                  </Button>
                )}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto p-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="py-6 text-center text-sm text-gray-600">
                Cargando colecciones...
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="py-4 px-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                Error: {error}
              </div>
            )}

            {/* Collection List */}
            {!loading && !error && collections.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {collections.map(collection => (
                  <label
                    key={collection.copy_id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedCollectionIds.includes(
                        collection.copy_id
                      )}
                      onCheckedChange={() =>
                        toggleCollection(collection.copy_id)
                      }
                      className="mt-0.5 border-gray-300 data-[state=checked]:bg-[#FFC000] data-[state=checked]:border-[#FFC000] data-[state=checked]:text-black"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {collection.title}
                      </p>
                      {collection.is_active && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-xs border-green-500 text-green-600"
                        >
                          Activa
                        </Badge>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && collections.length === 0 && (
              <div className="py-6 text-center text-sm text-gray-600">
                No tienes colecciones copiadas aún.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear filters button (outside popover) */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
