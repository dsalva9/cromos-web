/**
 * Hook to fetch all available badge definitions
 */

'use client';

import { useState, useEffect } from 'react';
import { getAllBadgeDefinitions, getBadgesByCategory } from '@/lib/supabase/badges';
import type { BadgeDefinition } from '@/types/badges';

export function useBadgeDefinitions() {
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDefinitions = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        const data = await getAllBadgeDefinitions();
        setDefinitions(data);
      } catch (err) {
        console.error('Error fetching badge definitions:', err);
        setIsError(true);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDefinitions();
  }, []);

  return {
    definitions,
    isLoading,
    isError,
    error,
  };
}

/**
 * Hook to get badge definitions by category
 */
export function useBadgeDefinitionsByCategory(category: string) {
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchDefinitions = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        const data = await getBadgesByCategory(category);
        setDefinitions(data);
      } catch (err) {
        console.error('Error fetching badge definitions by category:', err);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDefinitions();
  }, [category]);

  return {
    definitions,
    isLoading,
    isError,
  };
}

/**
 * Hook to get definitions grouped by category
 */
export function useBadgeDefinitionsGrouped() {
  const { definitions, isLoading, isError } = useBadgeDefinitions();

  const grouped = definitions.reduce(
    (acc, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = [];
      }
      acc[badge.category].push(badge);
      return acc;
    },
    {} as Record<string, BadgeDefinition[]>
  );

  return {
    grouped,
    isLoading,
    isError,
  };
}
