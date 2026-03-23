'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        'relative h-3 w-full overflow-hidden rounded-full bg-gray-700 border-2 border-black',
        className
      )}
      {...props}
    >
      <motion.div
        data-slot="progress-indicator"
        className={cn(
          'h-full w-full bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-500/50',
          indicatorClassName
        )}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: (value || 0) / 100 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{ transformOrigin: 'left' }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
