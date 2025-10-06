import * as React from 'react';
import { cn } from '@/lib/utils';

const ModernCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden',
      className
    )}
    {...props}
  />
));
ModernCard.displayName = 'ModernCard';

const ModernCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4', className)} {...props} />
));
ModernCardContent.displayName = 'ModernCardContent';

export { ModernCard, ModernCardContent };

