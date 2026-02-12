'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 500);
  const isExternalSync = useRef(false);

  // Sync when external value changes (e.g. from URL params)
  useEffect(() => {
    if (value !== localValue) {
      isExternalSync.current = true;
      setLocalValue(value);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Skip calling onChange when the change came from an external prop sync
    // to avoid a race condition that resets the value
    if (isExternalSync.current) {
      isExternalSync.current = false;
      return;
    }
    onChange(debouncedValue);
  }, [debouncedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
      <Input
        type="text"
        value={localValue}
        onChange={e => {
          isExternalSync.current = false;
          setLocalValue(e.target.value);
        }}
        placeholder={placeholder || 'Search...'}
        className={cn(
          "pl-10 bg-white border-2 border-black text-gray-900 placeholder:text-gray-600",
          className
        )}
      />
    </div>
  );
}
