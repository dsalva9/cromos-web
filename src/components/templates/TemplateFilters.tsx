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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('templates.filters');

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder={t('searchPlaceholder')}
      />

      {/* Sort */}
      <div className="flex items-center gap-4">
        <Label className="text-gray-900 dark:text-white">{t('sortLabel')}</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-48 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t('sortRecent')}</SelectItem>
            <SelectItem value="rating">{t('sortRating')}</SelectItem>
            <SelectItem value="popular">{t('sortPopular')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
