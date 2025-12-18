'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UserLinkProps {
  /** The user ID to link to */
  userId: string;
  /** The user's nickname to display */
  nickname: string | null | undefined;
  /** Optional CSS class names */
  className?: string;
  /** Whether the link should be disabled (just shows text) */
  disabled?: boolean;
  /** Custom styling variant */
  variant?: 'default' | 'subtle' | 'bold' | 'muted';
  /** Optional click handler for additional functionality */
  onClick?: () => void;
  /** Whether to render as a span instead of a link (to avoid nested anchors) */
  forceSpan?: boolean;
}

export function UserLink({
  userId,
  nickname,
  className,
  disabled = false,
  variant = 'default',
  onClick,
  forceSpan = false,
}: UserLinkProps) {
  // Fallback to "Usuario" if nickname is null, undefined, or empty
  const displayName = nickname && nickname.trim() ? nickname : 'Usuario';

  // Base styles for the link
  const baseStyles = 'transition-colors duration-200';

  // Variant-specific styles
  const variantStyles = {
    default: 'text-gray-900 dark:text-white hover:text-[#FFC000] hover:underline',
    subtle: 'text-gray-600 dark:text-gray-300 hover:text-[#FFC000] hover:underline',
    bold: 'font-bold text-gray-900 dark:text-white hover:text-[#FFC000] hover:underline',
    muted: 'text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline',
  };

  const combinedClassName = cn(baseStyles, variantStyles[variant], className);

  if (disabled || forceSpan) {
    return (
      <span
        className={cn(
          combinedClassName,
          forceSpan ? 'cursor-pointer' : 'cursor-default'
        )}
      >
        {displayName}
      </span>
    );
  }

  return (
    <Link
      href={`/users/${userId}`}
      className={combinedClassName}
      onClick={onClick}
    >
      {displayName}
    </Link>
  );
}
