'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, Plus, Check, X, Copy as CopyIcon } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

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
        console.log('Fetching template copies...');
        console.log('Current user:', await supabase.auth.getUser());

        // First try the test function
        console.log('Trying test function...');
        const { data: testData, error: testError } = await supabase.rpc(
          'test_get_my_template_copies'
        );
        console.log('Test RPC response:', { data: testData, error: testError });

        // Try the basic version first
        console.log('Trying basic function...');
        const { data: basicData, error: basicError } = await supabase.rpc(
          'get_my_template_copies_basic'
        );
        console.log('Basic RPC response:', {
          data: basicData,
          error: basicError,
        });

        // Now try the full function
        console.log('Trying full function...');
        const { data, error: rpcError } = await supabase.rpc(
          'get_my_template_copies'
        );

        console.log('Full RPC response:', { data, error: rpcError });

        if (rpcError) {
          console.error('Full RPC Error details:', rpcError);
          // If the full function fails but basic works, use basic data
          if (basicData && !basicError) {
            console.log('Using basic data as fallback');
            setCopies(
              basicData.map((item: TemplateCopy) => ({
                ...item,
                completed_slots: 0,
                total_slots: 0,
                completion_percentage: 0,
              }))
            );
            return;
          }
          // If both fail, try to use test data
          if (testData && !testError) {
            console.log('Using test data as fallback');
            setCopies(
              testData.map((item: TemplateCopy) => ({
                ...item,
                original_author_id: '',
                completed_slots: 0,
                total_slots: 0,
                completion_percentage: 0,
              }))
            );
            return;
          }
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
        console.error('Error fetching template copies:', err);
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
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
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

          <div className="flex gap-2">
            <Link href="/templates">
              <Button
                variant="outline"
                className="text-white border-gray-600 hover:bg-gray-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Explorar Colecciones
              </Button>
            </Link>
            <Link href="/templates/create">
              <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700]">
                <Plus className="mr-2 h-4 w-4" />
                Crear Colección
              </Button>
            </Link>
          </div>
        </div>

        {/* Templates Grid */}
        {copies.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">
              Aún no has copiado ninguna colección
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
                        <Badge
                          className={`
                          ${copy.is_active ? 'bg-green-500' : 'bg-gray-500'} 
                          text-white uppercase text-xs
                        `}
                        >
                          {copy.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
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
                      <Link href={`/mis-plantillas/${copy.copy_id}`}>
                        <Button className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold">
                          Ver Progreso
                        </Button>
                      </Link>
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
