'use client';

import { SearchBar } from '@/components/marketplace/SearchBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type SortOption = 'recent' | 'rating' | 'popular';

interface TemplateFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function TemplateFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: TemplateFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Buscar plantillas por título o descripción..."
      />

      {/* Sort */}
      <div className="flex items-center gap-4">
        <Label className="text-gray-900 dark:text-white">Ordenar por:</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-48 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Más Recientes</SelectItem>
            <SelectItem value="rating">Mejor Valoradas</SelectItem>
            <SelectItem value="popular">Más Populares</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
