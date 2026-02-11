'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent, ModernCardHeader } from '@/components/ui/modern-card';
import { Loader2, Clock, Shield, Trash2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface RetentionStats {
  pending_deletions: number;
  next_deletion_date: string | null;
  legal_holds: number;
  processed_today: number;
  pending_accounts: number;
  pending_listings: number;
  pending_templates: number;
}

export function RetentionDashboard() {
  const supabase = useSupabaseClient();
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data, error } = await supabase.rpc('admin_get_retention_stats');

        if (error) {
          logger.error('Error loading retention stats:', error);
        } else {
          setStats(data as unknown as RetentionStats);
        }
      } catch (err) {
        logger.error('Failed to load retention stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [supabase]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Ninguna';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFC000]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Pending Deletions */}
      <ModernCard>
        <ModernCardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#FFC000]" />
            <h3 className="text-lg font-semibold text-white">Eliminaciones Pendientes</h3>
          </div>
        </ModernCardHeader>
        <ModernCardContent>
          <p className="text-3xl font-bold text-white">{stats?.pending_deletions || 0}</p>
          <p className="text-sm text-gray-400 mt-2">
            Próxima: {formatDate(stats?.next_deletion_date || null)}
          </p>
          <div className="mt-3 space-y-1 text-xs text-gray-500">
            <div>Cuentas: {stats?.pending_accounts || 0}</div>
            <div>Anuncios: {stats?.pending_listings || 0}</div>
            <div>Plantillas: {stats?.pending_templates || 0}</div>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Legal Holds */}
      <ModernCard>
        <ModernCardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-white">Retenciones Legales</h3>
          </div>
        </ModernCardHeader>
        <ModernCardContent>
          <p className="text-3xl font-bold text-orange-500">{stats?.legal_holds || 0}</p>
          <p className="text-sm text-gray-400 mt-2">
            Órdenes de preservación activas
          </p>
        </ModernCardContent>
      </ModernCard>

      {/* Processed Today */}
      <ModernCard>
        <ModernCardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-white">Procesado Hoy</h3>
          </div>
        </ModernCardHeader>
        <ModernCardContent>
          <p className="text-3xl font-bold text-white">{stats?.processed_today || 0}</p>
          <p className="text-sm text-gray-400 mt-2">
            Elementos eliminados permanentemente
          </p>
        </ModernCardContent>
      </ModernCard>

      {/* System Health */}
      <ModernCard>
        <ModernCardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-white">Estado del Sistema</h3>
          </div>
        </ModernCardHeader>
        <ModernCardContent>
          <p className="text-3xl font-bold text-green-500">âœ“</p>
          <p className="text-sm text-gray-400 mt-2">
            Sistema de retención operativo
          </p>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
}
