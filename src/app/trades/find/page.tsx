'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSupabase, useUser } from '@/components/providers/SupabaseProvider';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { FindTradersFilters } from '@/components/trades/FindTradersFilters';
import { MatchCard } from '@/components/trades/MatchCard';
import { toast } from '@/lib/toast';
import { useFindTraders } from '@/hooks/trades/useFindTraders';

interface Collection {
  id: number;
  name: string;
  competition: string;
  year: string;
}

interface UserCollection extends Collection {
  is_user_active: boolean;
  joined_at: string;
}

function FindTradersContent() {
  const { supabase } = useSupabase();
  const { user, loading: userLoading } = useUser();
  const [ownedCollections, setOwnedCollections] = useState<UserCollection[]>(
    []
  );
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null);

  // Filter states
  const [filters, setFilters] = useState({
    rarity: '',
    team: '',
    query: '',
    minOverlap: 1,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Trading hook
  const {
    matches,
    loading: matchesLoading,
    error: matchesError,
    hasMore,
    totalCount,
    searchTrades,
  } = useFindTraders();

  // Active collection helper
  const activeCollection = useMemo(
    () => ownedCollections.find(c => c.is_user_active),
    [ownedCollections]
  );

  // Fetch user's collections with useCallback
  const fetchCollections = useCallback(async () => {
    if (!user) return;

    try {
      setCollectionsLoading(true);

      const { data, error } = await supabase
        .from('user_collections')
        .select(
          `
          is_active,
          joined_at,
          collections (
            id,
            name,
            competition,
            year
          )
        `
        )
        .eq('user_id', user.id);

      if (error) throw error;

      const collections = (data || [])
        .map(uc => {
          const collection = Array.isArray(uc.collections)
            ? uc.collections[0]
            : uc.collections;

          if (!collection) return null;

          return {
            ...collection,
            is_user_active: uc.is_active,
            joined_at: uc.joined_at,
          } as UserCollection;
        })
        .filter(Boolean) as UserCollection[];

      setOwnedCollections(collections);

      // Auto-select active collection if available
      const activeCol = collections.find(c => c.is_user_active);
      if (activeCol) {
        setSelectedCollectionId(activeCol.id);
      } else if (collections.length > 0) {
        setSelectedCollectionId(collections[0].id);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
    } finally {
      setCollectionsLoading(false);
    }
  }, [user, supabase]);

  // Search effect
  useEffect(() => {
    if (selectedCollectionId && user) {
      searchTrades({
        userId: user.id,
        collectionId: selectedCollectionId,
        filters,
        limit: pageSize,
        offset: currentPage * pageSize,
      });
    }
  }, [user, selectedCollectionId, filters, currentPage, searchTrades]);

  // Initial load
  useEffect(() => {
    if (!userLoading && user) {
      fetchCollections();
    }
  }, [user, userLoading, fetchCollections]);

  // Handle filter changes (reset pagination)
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(0);
  };

  // Handle collection change (reset pagination)
  const handleCollectionChange = (collectionId: number) => {
    setSelectedCollectionId(collectionId);
    setCurrentPage(0);
  };

  // Show toast for errors
  useEffect(() => {
    if (matchesError) {
      toast.error(matchesError);
    }
  }, [matchesError]);

  if (userLoading || collectionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Cargando intercambios...</div>
      </div>
    );
  }

  // No collections state
  if (ownedCollections.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center p-4">
        <ModernCard className="bg-white max-w-md w-full">
          <ModernCardContent className="p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Sin colecciones
            </h2>
            <p className="text-gray-600 mb-6">
              Necesitas seguir al menos una colección para buscar intercambios.
            </p>
            <Button
              onClick={() => (window.location.href = '/profile')}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              Seguir colecciones
            </Button>
          </ModernCardContent>
        </ModernCard>
      </div>
    );
  }

  // No active collection warning
  const showActiveWarning = !activeCollection && ownedCollections.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
              Buscar intercambios
            </h1>
            <p className="text-white/80">
              Encuentra usuarios que tengan cromos que necesitas
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            className="self-center sm:self-start bg-white/10 text-white hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            <Link href="/trades/inbox">Buzón Intercambios</Link>
          </Button>
        </div>

        {/* Active collection warning */}
        {showActiveWarning && (
          <ModernCard className="bg-orange-50 border-2 border-orange-200 mb-6">
            <ModernCardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                <div>
                  <h4 className="text-orange-800 font-semibold">
                    Recomendación
                  </h4>
                  <p className="text-orange-700 text-sm">
                    Considera activar una colección desde tu perfil para
                    facilitar la navegación.
                  </p>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        )}

        {/* Filters */}
        <ModernCard className="bg-white/95 backdrop-blur-sm mb-6">
          <ModernCardContent className="p-6">
            <FindTradersFilters
              collections={ownedCollections}
              selectedCollectionId={selectedCollectionId}
              filters={filters}
              onCollectionChange={handleCollectionChange}
              onFiltersChange={handleFiltersChange}
            />
          </ModernCardContent>
        </ModernCard>

        {/* Results Summary */}
        {selectedCollectionId && !matchesLoading && (
          <div className="mb-6">
            <ModernCard className="bg-white/90 backdrop-blur-sm">
              <ModernCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                    <span className="font-semibold text-gray-700">
                      {matches.length > 0
                        ? `${matches.length} intercambios encontrados`
                        : 'Sin intercambios disponibles'}
                    </span>
                  </div>
                  {totalCount > 0 && (
                    <span className="text-sm text-gray-500">
                      Página {currentPage + 1}
                    </span>
                  )}
                </div>
              </ModernCardContent>
            </ModernCard>
          </div>
        )}

        {/* Loading state */}
        {matchesLoading && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <ModernCard key={i} className="bg-white animate-pulse">
                <ModernCardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </ModernCardContent>
              </ModernCard>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!matchesLoading && matches.length > 0 && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {matches.map(match => (
              <MatchCard
                key={match.match_user_id}
                match={match}
                collectionId={selectedCollectionId!}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!matchesLoading && matches.length === 0 && selectedCollectionId && (
          <div className="text-center py-12">
            <ModernCard className="bg-white/90 backdrop-blur-sm max-w-md mx-auto">
              <ModernCardContent className="p-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Sin intercambios disponibles
                </h3>
                <p className="text-gray-500 text-sm">
                  Prueba ajustando los filtros o eligiendo otra colección.
                </p>
              </ModernCardContent>
            </ModernCard>
          </div>
        )}

        {/* Pagination */}
        {!matchesLoading && matches.length > 0 && (
          <div className="flex justify-center space-x-2">
            <Button
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="bg-white/90 text-gray-700 border-gray-300 hover:bg-white"
            >
              Anterior
            </Button>
            <div className="flex items-center px-4 py-2 bg-white/90 rounded-lg">
              <span className="text-gray-700 font-medium">
                Página {currentPage + 1}
              </span>
            </div>
            <Button
              variant="outline"
              disabled={!hasMore || matches.length < pageSize}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="bg-white/90 text-gray-700 border-gray-300 hover:bg-white"
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FindTradersPage() {
  return (
    <AuthGuard>
      <FindTradersContent />
    </AuthGuard>
  );
}
