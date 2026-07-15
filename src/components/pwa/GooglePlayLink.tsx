'use client';

import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ReactNode } from 'react';

interface GooglePlayLinkProps {
  source: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}

export default function GooglePlayLink({
  source,
  className,
  onClick,
  children,
}: GooglePlayLinkProps) {
  const supabase = useSupabaseClient();

  const handleClick = () => {
    // Fire-and-forget analytics event tracking
    supabase
      .from('analytics_events' as any)
      .insert({
        event_name: 'google_play_click',
        metadata: { source },
      })
      .then();

    // Compose with external onClick handler if provided
    if (onClick) {
      onClick();
    }
  };

  return (
    <a
      href="https://play.google.com/store/apps/details?id=com.cambiocromos.app"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
