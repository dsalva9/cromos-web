'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'comfortable' | 'compact';
  onViewChange: (view: 'comfortable' | 'compact') => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-slate-400 mr-2">Vista:</span>
      <div className="flex bg-slate-800 rounded-lg p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewChange('comfortable')}
          className={cn(
            'transition-all duration-200',
            view === 'comfortable'
              ? 'bg-yellow-400 text-black hover:bg-yellow-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          )}
          title="Vista cómoda"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewChange('compact')}
          className={cn(
            'transition-all duration-200',
            view === 'compact'
              ? 'bg-yellow-400 text-black hover:bg-yellow-500'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          )}
          title="Vista compacta"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
