import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, ChevronDown } from 'lucide-react';

interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
  is_user_active: boolean;
}

interface Filters {
  rarity: string;
  team: string;
  query: string;
  minOverlap: number;
}

interface FindTradersFiltersProps {
  collections: Collection[];
  selectedCollectionId: number | null;
  filters: Filters;
  onCollectionChange: (collectionId: number) => void;
  onFiltersChange: (filters: Filters) => void;
}

const RARITY_OPTIONS = [
  { value: '', label: 'Todas las rarezas' },
  { value: 'common', label: 'Común' },
  { value: 'rare', label: 'Rara' },
  { value: 'epic', label: 'Épica' },
  { value: 'legendary', label: 'Legendaria' },
];

const MIN_OVERLAP_OPTIONS = [1, 2, 3, 5, 10];

export function FindTradersFilters({
  collections,
  selectedCollectionId,
  filters,
  onCollectionChange,
  onFiltersChange,
}: FindTradersFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] =
    useState(false);
  const [isRarityDropdownOpen, setIsRarityDropdownOpen] = useState(false);

  // Debounced filter updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange(localFilters);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [localFilters, onFiltersChange]);

  // Reset local filters when external filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const selectedCollection = collections.find(
    c => c.id === selectedCollectionId
  );
  const selectedRarity = RARITY_OPTIONS.find(
    r => r.value === localFilters.rarity
  );

  const handleFilterUpdate = (key: keyof Filters, value: string | number) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const clearedFilters = { rarity: '', team: '', query: '', minOverlap: 1 };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters =
    localFilters.rarity ||
    localFilters.team ||
    localFilters.query ||
    localFilters.minOverlap > 1;

  return (
    <div className="space-y-4 bg-white border-2 border-black rounded-md p-4 shadow-xl">
      {/* Collection Selector */}
      <div>
        <label className="block text-sm font-bold uppercase text-gray-900 mb-2">
          Colección
        </label>
        <div className="relative">
          <button
            onClick={() =>
              setIsCollectionDropdownOpen(!isCollectionDropdownOpen)
            }
            className="w-full bg-gray-50 border-2 border-black rounded-md px-4 py-2 text-left flex items-center justify-between hover:border-[#FFC000] focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-white transition-colors text-gray-900 font-medium"
            aria-haspopup="listbox"
            aria-expanded={isCollectionDropdownOpen}
          >
            <span className="truncate">
              {selectedCollection
                ? `${selectedCollection.name} (${selectedCollection.year})`
                : 'Selecciona una colección'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-600" />
            {selectedCollection?.is_user_active && (
              <Badge
                variant="secondary"
                className="ml-2 bg-[#FFC000] text-gray-900 border border-black font-bold"
              >
                Activa
              </Badge>
            )}
          </button>

          {isCollectionDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsCollectionDropdownOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-gray-50 border-2 border-black rounded-md shadow-xl max-h-60 overflow-y-auto">
                {collections.map(collection => (
                  <button
                    key={collection.id}
                    onClick={() => {
                      onCollectionChange(collection.id);
                      setIsCollectionDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between focus:outline-none focus:bg-gray-200 text-gray-900 font-medium transition-colors border-b border-gray-200 last:border-b-0"
                  >
                    <span className="truncate">
                      {collection.name} ({collection.year})
                    </span>
                    {collection.is_user_active && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-[#FFC000] text-gray-900 border border-black font-bold text-xs"
                      >
                        Activa
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search Query */}
      <div>
        <label className="block text-sm font-bold uppercase text-gray-900 mb-2">
          Buscar jugador
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600" />
          <Input
            type="text"
            placeholder="Nombre del jugador..."
            value={localFilters.query}
            onChange={e => handleFilterUpdate('query', e.target.value)}
            className="pl-10 bg-gray-50 border-2 border-black text-gray-900 placeholder:text-gray-400 focus:border-[#FFC000] focus:ring-[#FFC000] rounded-md"
          />
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-gray-900 hover:text-white bg-gray-50 hover:bg-[#FFC000] border-2 border-black font-bold uppercase text-xs rounded-md"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros avanzados
          <ChevronDown
            className={`w-4 h-4 ml-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </Button>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="text-gray-900 hover:text-white bg-gray-50 hover:bg-[#E84D4D] border-2 border-black font-bold uppercase text-xs rounded-md"
          >
            <X className="w-4 h-4 mr-1" />
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t-2 border-gray-200">
          {/* Rarity Filter */}
          <div>
            <label className="block text-sm font-bold uppercase text-gray-900 mb-2">
              Rareza
            </label>
            <div className="relative">
              <button
                onClick={() => setIsRarityDropdownOpen(!isRarityDropdownOpen)}
                className="w-full bg-gray-50 border-2 border-black rounded-md px-4 py-2 text-left flex items-center justify-between hover:border-[#FFC000] focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2 focus:ring-offset-white transition-colors text-gray-900 font-medium"
                aria-haspopup="listbox"
                aria-expanded={isRarityDropdownOpen}
              >
                <span>{selectedRarity?.label || 'Todas las rarezas'}</span>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>

              {isRarityDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsRarityDropdownOpen(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-gray-50 border-2 border-black rounded-md shadow-xl">
                    {RARITY_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          handleFilterUpdate('rarity', option.value);
                          setIsRarityDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-200 text-gray-900 font-medium transition-colors border-b border-gray-200 last:border-b-0"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-sm font-bold uppercase text-gray-900 mb-2">
              Equipo
            </label>
            <Input
              type="text"
              placeholder="Nombre del equipo..."
              value={localFilters.team}
              onChange={e => handleFilterUpdate('team', e.target.value)}
              className="bg-gray-50 border-2 border-black text-gray-900 placeholder:text-gray-400 focus:border-[#FFC000] focus:ring-[#FFC000] rounded-md"
            />
          </div>

          {/* Min Overlap Filter */}
          <div>
            <label className="block text-sm font-bold uppercase text-gray-900 mb-2">
              Coincidencias mínimas
            </label>
            <div className="flex flex-wrap gap-2">
              {MIN_OVERLAP_OPTIONS.map(value => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={
                    localFilters.minOverlap === value ? 'default' : 'outline'
                  }
                  onClick={() => handleFilterUpdate('minOverlap', value)}
                  className={
                    localFilters.minOverlap === value
                      ? 'bg-[#FFC000] hover:bg-yellow-400 text-gray-900 border-2 border-black font-bold rounded-md'
                      : 'text-gray-900 hover:text-white bg-gray-50 hover:bg-gray-700 border-2 border-black font-bold rounded-md'
                  }
                >
                  {value}+
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              Número mínimo de cromos que pueden intercambiarse mutuamente
            </p>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-4 border-t-2 border-gray-200">
          {localFilters.rarity && (
            <Badge variant="secondary" className="bg-[#FFC000] text-gray-900 border-2 border-black font-bold flex items-center gap-1">
              Rareza:{' '}
              {RARITY_OPTIONS.find(r => r.value === localFilters.rarity)?.label}
              <button
                onClick={() => handleFilterUpdate('rarity', '')}
                className="ml-1 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-black rounded"
                aria-label="Quitar filtro de rareza"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {localFilters.team && (
            <Badge variant="secondary" className="bg-[#FFC000] text-gray-900 border-2 border-black font-bold flex items-center gap-1">
              Equipo: {localFilters.team}
              <button
                onClick={() => handleFilterUpdate('team', '')}
                className="ml-1 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-black rounded"
                aria-label="Quitar filtro de equipo"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {localFilters.query && (
            <Badge variant="secondary" className="bg-[#FFC000] text-gray-900 border-2 border-black font-bold flex items-center gap-1">
              Jugador: {localFilters.query}
              <button
                onClick={() => handleFilterUpdate('query', '')}
                className="ml-1 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-black rounded"
                aria-label="Quitar filtro de jugador"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {localFilters.minOverlap > 1 && (
            <Badge variant="secondary" className="bg-[#FFC000] text-gray-900 border-2 border-black font-bold flex items-center gap-1">
              Min. {localFilters.minOverlap} coincidencias
              <button
                onClick={() => handleFilterUpdate('minOverlap', 1)}
                className="ml-1 hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-black rounded"
                aria-label="Quitar filtro de coincidencias mínimas"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

