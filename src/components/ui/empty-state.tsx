'use client';

import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Icon className="w-24 h-24 text-gray-400 dark:text-gray-600 mb-6" />
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-300 mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        <>
          {actionHref ? (
            <Link href={actionHref}>
              <Button className="bg-yellow-400 text-black hover:bg-yellow-500 font-medium">
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button
              onClick={onAction}
              className="bg-yellow-400 text-black hover:bg-yellow-500 font-medium"
            >
              {actionLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
