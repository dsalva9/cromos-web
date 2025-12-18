'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUserCollections } from '@/hooks/templates/useUserCollections';

interface CollectionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onCollectionSelect?: (copyId: number, title: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * CollectionCombobox Component
 *
 * Allows users to either type a collection name OR select from their template copies.
 * When a template is selected, triggers callback for slot selection.
 *
 * @param value - Current collection_name value
 * @param onChange - Callback when value changes (for free text)
 * @param onCollectionSelect - Callback when user selects a template copy (copyId, title)
 * @param placeholder - Placeholder text
 * @param className - Additional CSS classes
 */
export function CollectionCombobox({
  value,
  onChange,
  onCollectionSelect,
  placeholder = 'Buscar o seleccionar colección...',
  className,
}: CollectionComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const { collections, loading } = useUserCollections();

  // Update internal value when prop changes
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (selectedTitle: string, copyId?: number) => {
    setInputValue(selectedTitle);
    onChange(selectedTitle);
    setOpen(false);

    // If a template copy was selected, trigger slot selection callback
    if (copyId && onCollectionSelect) {
      onCollectionSelect(copyId, selectedTitle);
    }
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between bg-white border-2 border-black text-gray-900 hover:bg-gray-50 hover:text-gray-900',
            className
          )}
        >
          <span className="truncate">
            {inputValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-white border-2 border-black"
        align="start"
      >
        <Command className="bg-white text-gray-900">
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={handleInputChange}
            className="text-gray-900 placeholder:text-gray-600"
          />
          <CommandList>
            <CommandEmpty className="text-gray-600 py-6">
              {inputValue ? (
                <div className="space-y-2">
                  <p className="text-sm">No se encontró la colección</p>
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSelect(inputValue);
                    }}
                    className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
                  >
                    Usar &quot;{inputValue}&quot;
                  </Button>
                </div>
              ) : (
                'Escribe para buscar o crear...'
              )}
            </CommandEmpty>

            {/* User's Collections */}
            {!loading && collections.length > 0 && (
              <CommandGroup heading="Mis Colecciones" className="text-gray-600">
                {collections
                  .filter(col =>
                    inputValue
                      ? col.title
                          .toLowerCase()
                          .includes(inputValue.toLowerCase())
                      : true
                  )
                  .map(collection => (
                    <div
                      key={collection.copy_id}
                      onClick={() => {
                        handleSelect(collection.title, collection.copy_id);
                      }}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 active:bg-gray-100 text-gray-900"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === collection.title
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <span className="truncate">{collection.title}</span>
                      {collection.is_active && (
                        <span className="ml-auto text-xs text-green-600">
                          ★
                        </span>
                      )}
                    </div>
                  ))}
              </CommandGroup>
            )}

            {/* Loading State */}
            {loading && (
              <div className="py-6 text-center text-sm text-gray-600">
                Cargando colecciones...
              </div>
            )}

            {/* Free Text Option */}
            {inputValue && inputValue.length > 0 && (
              <CommandGroup heading="Otra" className="text-gray-600">
                <div
                  onClick={() => {
                    handleSelect(inputValue);
                  }}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 active:bg-gray-100 text-gray-900"
                >
                  <span className="truncate">
                    Usar &quot;{inputValue}&quot;
                  </span>
                </div>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
