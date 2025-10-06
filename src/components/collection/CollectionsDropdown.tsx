import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
}

interface CollectionsDropdownProps {
  collections: Collection[];
  currentId: number;
  activeId: number | null;
  onSelect?: (collectionId: number) => void;
}

export default function CollectionsDropdown({
  collections,
  currentId,
  activeId,
  onSelect,
}: CollectionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const currentCollection = collections.find(c => c.id === currentId);

  const handleSelect = (collectionId: number) => {
    setIsOpen(false);

    if (onSelect) {
      onSelect(collectionId);
    } else {
      // Default navigation
      router.push(`/mi-coleccion/${collectionId}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, collectionId: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(collectionId);
    }
  };

  if (collections.length <= 1) {
    return null; // Don't show dropdown if user only has one collection
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/90 backdrop-blur-sm border border-white/30 text-gray-800 hover:bg-white/95 min-w-[200px] justify-between"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center space-x-2 truncate">
          <span className="truncate">
            {currentCollection
              ? `${currentCollection.competition} ${currentCollection.year}`
              : 'Seleccionar colección'}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                Mis Colecciones ({collections.length})
              </div>

              <div role="listbox" className="space-y-1">
                {collections.map(collection => {
                  const isActive = activeId === collection.id;
                  const isCurrent = currentId === collection.id;

                  return (
                    <div
                      key={collection.id}
                      role="option"
                      aria-selected={isCurrent}
                      tabIndex={0}
                      className={`
                        flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                        ${
                          isCurrent
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                      `}
                      onClick={() => handleSelect(collection.id)}
                      onKeyDown={e => handleKeyDown(e, collection.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {collection.name}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {collection.competition} {collection.year}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-3">
                        {isActive && (
                          <Badge className="bg-green-500 text-white text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Activa
                          </Badge>
                        )}
                        {isCurrent && !isActive && (
                          <Badge variant="outline" className="text-xs">
                            Actual
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

