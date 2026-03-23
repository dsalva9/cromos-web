import { cn } from '@/lib/utils';

/**
 * StatusBadge — a small, reusable badge that consumes the badge-*
 * utility classes defined in theme.css.
 *
 * Usage:
 *   <StatusBadge variant="success">Activo</StatusBadge>
 *   <StatusBadge variant="warning" size="sm" dot>Vendido</StatusBadge>
 */

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'xs' | 'sm' | 'md';

interface StatusBadgeProps {
  variant: BadgeVariant;
  size?: BadgeSize;
  /** Show a colored dot before the label */
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  error: 'bg-[var(--error)]',
  info: 'bg-[var(--info)]',
  neutral: 'bg-[var(--muted)]',
};

export function StatusBadge({
  variant,
  size = 'sm',
  dot = false,
  className,
  children,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold leading-none whitespace-nowrap',
        `badge-${variant}`,
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
