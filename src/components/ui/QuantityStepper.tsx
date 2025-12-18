'use client';

import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A reusable counter control for adjusting quantities, with min/max bounds.
 * It's styled for the retro-comic theme and includes accessibility features.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  size = 'md',
  className,
}: QuantityStepperProps) {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - 1);
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + 1);
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const atMin = value <= min;
  const atMax = value >= max;

  const sizeClasses = {
    sm: {
      container: 'h-8',
      button: 'h-8 w-8',
      icon: 'h-4 w-4',
      value: 'w-8 text-sm',
    },
    md: {
      container: 'h-10',
      button: 'h-10 w-10',
      icon: 'h-5 w-5',
      value: 'w-10 text-base',
    },
  };

  const styles = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-md border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-800',
        styles.container,
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn('rounded-r-none hover:bg-gray-200 dark:hover:bg-gray-700', styles.button)}
        onClick={handleDecrement}
        disabled={atMin}
        aria-label="Disminuir cantidad"
      >
        <Minus className={styles.icon} />
      </Button>
      <div
        className={cn(
          'flex h-full items-center justify-center font-bold text-gray-900 dark:text-white',
          styles.value
        )}
        aria-live="polite"
      >
        {value}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn('rounded-l-none hover:bg-gray-200 dark:hover:bg-gray-700', styles.button)}
        onClick={handleIncrement}
        disabled={atMax}
        aria-label="Aumentar cantidad"
      >
        <Plus className={styles.icon} />
      </Button>
    </div>
  );
}
