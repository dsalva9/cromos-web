/**
 * Tooltip Component
 * Simple tooltip implementation with hover support and animations
 */

'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export function TooltipProvider({ children }: TooltipProps) {
  return <>{children}</>;
}

interface TooltipContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  delayDuration: number;
}

const TooltipContext = React.createContext<TooltipContextType | undefined>(undefined);

export function Tooltip({
  children,
  delayDuration = 200
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipContext.Provider value={{ open, setOpen, delayDuration }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  TooltipTriggerProps
>(({ children, asChild = false, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (!context) return <>{children}</>;

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      context.setOpen(true);
    }, context.delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    context.setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ref,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      ...props,
    });
  }

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipTrigger.displayName = 'TooltipTrigger';

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
  }
>(({ className, children, side = 'top', ...props }, ref) => {
  const context = React.useContext(TooltipContext);

  if (!context) return null;

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <AnimatePresence>
      {context.open && (
        <motion.div
          ref={ref as React.Ref<HTMLDivElement>}
          initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : side === 'bottom' ? -4 : 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'absolute z-50 overflow-hidden rounded-lg border bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100 shadow-lg border-gray-200 dark:border-gray-700 whitespace-nowrap pointer-events-none',
            sideClasses[side],
            className
          )}
          {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
        >
          {children}
          {/* Subtle pointer tip */}
          <div
            className={cn(
              "absolute w-2 h-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rotate-45",
              side === 'top' && "bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r",
              side === 'bottom' && "top-[-5px] left-1/2 -translate-x-1/2 border-t border-l",
              side === 'left' && "right-[-5px] top-1/2 -translate-y-1/2 border-t border-r",
              side === 'right' && "left-[-5px] top-1/2 -translate-y-1/2 border-b border-l",
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});
TooltipContent.displayName = 'TooltipContent';
