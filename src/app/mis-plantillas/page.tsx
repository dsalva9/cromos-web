'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';

import Link from 'next/link';
import { ArrowLeft, Plus, Check, X, Copy as CopyIcon } from 'lucide-react';
import { TemplateSkeleton } from '@/components/skeletons/TemplateSkeleton';
import AuthGuard from '@/components/AuthGuard';
import { logger } from '@/lib/logger';

interface TemplateCopy {
  copy_id: string;
  template_id: string;
  title: string;
  is_active: boolean;
  copied_at: string;
  original_author_nickname: string;
  original_author_id: string;
  completed_slots: number;
  total_slots: number;
  completion_percentage: number;
}

function MyTemplatesContent() {
  const supabase = useSupabaseClient();
  const [copies, setCopies] = useState<TemplateCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCopies = async () => {
      try {
        setLoading(true);
        logger.debug('Fetching template copies...');
        logger.debug('Current user:', await supabase.auth.getUser());

        // Fixed: Simplified RPC calls to use only the canonical function (get_my_template_copies)
        // Database schema confirms this is the only existing RPC function for this purpose
        // Removed fallback logic for test_get_my_template_copies and get_my_template_copies_basic
        // as these functions do not exist in the database schema
        const { data, error: rpcError } = await supabase.rpc(
          'get_my_template_copies'
        );

        logger.debug('RPC response:', { data, error: rpcError });

        if (rpcError) {
          logger.error('RPC Error details:', rpcError);
          throw rpcError;
        }

        // Update each copy with correct progress data
        const updatedCopies = (data || []).map((copy: TemplateCopy) => {
          // Calculate progress based on the actual progress data
          const completed = copy.completed_slots || 0;
          const total = copy.total_slots || 0;
          const completionPercentage =
            total > 0 ? Math.round((completed / total) * 100) : 0;

          return {
            ...copy,
            completed_slots: completed,
            total_slots: total,
            completion_percentage: completionPercentage,
          };
        });

        setCopies(updatedCopies);
      } catch (err) {
        logger.error('Error fetching template copies:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchCopies();
  }, [supabase]);

  const getCompletionPercentage = (copy: TemplateCopy) => {
    // Use the percentage from RPC if available, otherwise calculate it
    if (copy.completion_percentage !== undefined) {
      return Math.round(copy.completion_percentage);
    }
    return copy.total_slots > 0
      ? Math.round((copy.completed_slots / copy.total_slots) * 100)
      : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937]">
        <div className="container mx-auto px-4 py-8">
          <TemplateSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">Error: {error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-white mb-2">
              Mis Colecciones
            </h1>
            <p className="text-gray-400">
              Gestiona tu progreso en las colecciones que has copiado
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/templates" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="text-white border-gray-600 hover:bg-gray-800 w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Explorar Plantillas de Colecciones
              </Button>
            </Link>
            <Link href="/templates/create" className="w-full sm:w-auto">
              <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] w-full">
                <Plus className="mr-2 h-4 w-4" />
                Crear Plantilla
              </Button>
            </Link>
          </div>
        </div>

        {/* Templates Grid */}
        {copies.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">
              {'A\u00fan no has copiado ninguna colecci\u00f3n'}
            </p>
            <Link href="/templates">
              <Button className="bg-[#FFC000] text-black">
                Explorar Colecciones
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {copies.map(copy => (
              <Link key={copy.copy_id} href={`/mis-plantillas/${copy.copy_id}`}>
                <ModernCard className="hover:scale-105 transition-transform cursor-pointer h-full">
                  <ModernCardContent className="p-6">
                    <div className="space-y-4">
                      {/* Title and Status */}
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-white text-lg line-clamp-2">
                          {copy.title}
                        </h3>

                      </div>

                      {/* Author */}
                      <p className="text-sm text-gray-400">
                        por {copy.original_author_nickname}
                      </p>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Completado</span>
                          <span className="text-white font-bold">
                            {getCompletionPercentage(copy)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-[#FFC000] h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${getCompletionPercentage(copy)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 text-center">
                          {copy.completed_slots || 0} / {copy.total_slots || 0}{' '}
                          cromos
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-900/30 rounded p-2">
                          <Check className="h-4 w-4 text-green-400 mx-auto mb-1" />
                          <p className="text-xs text-white font-bold">
                            {copy.completed_slots}
                          </p>
                        </div>
                        <div className="bg-[#FFC000]/20 rounded p-2">
                          <CopyIcon className="h-4 w-4 text-[#FFC000] mx-auto mb-1" />
                          <p className="text-xs text-white font-bold">
                            {copy.total_slots - copy.completed_slots}
                          </p>
                        </div>
                        <div className="bg-gray-800/30 rounded p-2">
                          <X className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                          <p className="text-xs text-white font-bold">
                            {copy.total_slots - copy.completed_slots}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
                        Ver Progreso
                      </Button>
                    </div>
                  </ModernCardContent>
                </ModernCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyTemplatesPage() {
  return (
    <AuthGuard>
      <MyTemplatesContent />
    </AuthGuard>
  );
}
