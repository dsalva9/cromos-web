'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  LayoutGrid, 
  Plus, 
  Check, 
  X, 
  User, 
  Trophy,
  ArrowRight
} from 'lucide-react';
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
        
        const { data, error: rpcError } = await supabase.rpc(
          'get_my_template_copies'
        );

        if (rpcError) {
          throw rpcError;
        }

        // Update each copy with correct progress data
        const updatedCopies = (data || []).map((copy: TemplateCopy) => {
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
    <div className="min-h-screen bg-[#1F2937] pb-20">
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase text-white mb-3 tracking-tight">
              Mis Colecciones
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl font-light">
              Gestiona tu progreso, completa tus álbumes y organiza tus cromos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Link href="/templates" className="flex-1 md:flex-none">
              <Button
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-12 px-6"
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Explorar Plantillas
              </Button>
            </Link>
            <Link href="/templates/create" className="flex-1 md:flex-none">
              <Button className="w-full bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold border-none h-12 px-6">
                <Plus className="mr-2 h-4 w-4" />
                Crear Plantilla
              </Button>
            </Link>
          </div>
        </div>

        {/* Templates Grid */}
        {copies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-800/30 rounded-3xl border border-gray-700/50 border-dashed">
            <div className="bg-gray-800 p-4 rounded-full mb-6">
              <LayoutGrid className="h-12 w-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No tienes colecciones activas</h3>
            <p className="text-gray-400 text-lg mb-8 text-center max-w-md">
              Empieza explorando las plantillas disponibles o crea tu propia colección desde cero.
            </p>
            <Link href="/templates">
              <Button className="bg-[#FFC000] text-black hover:bg-[#FFD700] font-bold h-12 px-8 text-lg">
                Explorar Colecciones
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {copies.map(copy => {
              const percentage = getCompletionPercentage(copy);
              const isComplete = percentage === 100;
              
              return (
                <Link key={copy.copy_id} href={`/mis-plantillas/${copy.copy_id}`} className="block h-full">
                  <div className="group relative bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-[#FFC000]/50 transition-all duration-300 hover:shadow-2xl hover:shadow-[#FFC000]/10 h-full flex flex-col">
                    {/* Top Gradient Bar */}
                    <div className={`h-1.5 w-full ${isComplete ? 'bg-gradient-to-r from-green-400 to-emerald-600' : 'bg-gradient-to-r from-[#FFC000] to-[#FFD700]'}`} />
                    
                    <div className="p-6 flex flex-col flex-grow">
                      {/* Header */}
                      <div className="mb-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-white group-hover:text-[#FFC000] transition-colors line-clamp-1">
                            {copy.title}
                          </h3>
                          {isComplete && (
                            <div className="bg-green-500/20 text-green-400 p-1 rounded-full">
                              <Trophy className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate">por {copy.original_author_nickname}</span>
                        </p>
                      </div>

                      {/* Progress Section */}
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-gray-300">Progreso</span>
                          <span className={isComplete ? "text-green-400" : "text-[#FFC000]"}>{percentage}%</span>
                        </div>
                        <div className="h-3 bg-gray-800 rounded-full overflow-hidden ring-1 ring-white/5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out relative ${isComplete ? 'bg-green-500' : 'bg-[#FFC000]'}`}
                            style={{ width: `${percentage}%` }}
                          >
                              <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 text-right font-mono">
                          {copy.completed_slots} / {copy.total_slots} cromos
                        </p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-gray-800/40 rounded-xl p-3 flex items-center justify-between border border-gray-800 group-hover:border-gray-700 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-500/10 rounded-lg">
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Tengo</span>
                          </div>
                          <span className="font-bold text-white text-lg">{copy.completed_slots}</span>
                        </div>
                        
                        <div className="bg-gray-800/40 rounded-xl p-3 flex items-center justify-between border border-gray-800 group-hover:border-gray-700 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-red-500/10 rounded-lg">
                              <X className="w-4 h-4 text-red-500" />
                            </div>
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Faltan</span>
                          </div>
                          <span className="font-bold text-white text-lg">{copy.total_slots - copy.completed_slots}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="mt-auto pt-4 border-t border-gray-800">
                        <div className="flex items-center justify-between text-sm font-bold text-gray-300 group-hover:text-[#FFC000] transition-colors">
                          <span>Gestionar Colección</span>
                          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
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
