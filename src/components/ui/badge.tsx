import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-bold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFC000] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-[#FFC000] text-black',
        outline: 'bg-transparent text-gray-900 dark:text-white',
        secondary: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
        destructive: 'bg-red-600 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
