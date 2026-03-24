'use client';

import { useEffect, useRef } from 'react';

interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Renders a JSON-LD `<script>` tag for structured data.
 * Safe for client components — injects via useEffect to avoid
 * dangerouslySetInnerHTML hydration issues.
 */
export function JsonLd({ data }: JsonLdProps) {
  const ref = useRef<HTMLScriptElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = JSON.stringify(data);
    }
  }, [data]);

  return (
    <script
      ref={ref}
      type="application/ld+json"
      suppressHydrationWarning
    />
  );
}
