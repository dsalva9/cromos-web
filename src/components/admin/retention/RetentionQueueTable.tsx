'use client';

import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Clock, Loader2 } from 'lucide-react';
import { LegalHoldControls } from './LegalHoldControls';
import { logger } from '@/lib/logger';

interface RetentionQueueItem {
  id: number;
  entity_type: string;
  entity_id: string;
  scheduled_for: string;
  reason: string | null;
  legal_hold_until: string | null;
  initiated_by: string | null;
  initiated_by_type: string | null;
  created_at: string;
}

export function RetentionQueueTable() {
  const supabase = useSupabaseClient();
  const [queue, setQueue] = useState<RetentionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RetentionQueueItem | null>(null);
  const [showLegalHold, setShowLegalHold] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('retention_schedule')
        .select('*')
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setQueue((data as unknown as RetentionQueueItem[]) || []);
    } catch (error) {
      logger.error('Error loading retention queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDaysRemaining = (scheduledDate: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const diffTime = scheduled.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'account': return 'Cuenta';
      case 'listing': return 'Anuncio';
      case 'template': return 'Plantilla';
      default: return type;
    }
  };

  const handleLegalHoldSuccess = () => {
    loadQueue();
    setShowLegalHold(false);
    setSelectedItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFC000]" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No hay elementos programados para eliminaciÃ³n</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>ID Entidad</TableHead>
              <TableHead>Programado Para</TableHead>
              <TableHead>DÃ­as Restantes</TableHead>
              <TableHead>Iniciado Por</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((item) => {
              const daysRemaining = calculateDaysRemaining(item.scheduled_for);
              const hasLegalHold = item.legal_hold_until !== null;

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">{getEntityTypeLabel(item.entity_type)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.entity_id}</TableCell>
                  <TableCell>{formatDate(item.scheduled_for)}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${daysRemaining <= 7 ? 'text-red-500' : daysRemaining <= 30 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {daysRemaining} dÃ­as
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.initiated_by_type === 'user' ? (
                      <span className="text-sm text-gray-400">Usuario</span>
                    ) : item.initiated_by_type === 'admin' ? (
                      <span className="text-sm text-orange-400">Admin</span>
                    ) : (
                      <span className="text-sm text-gray-500">Sistema</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {hasLegalHold ? (
                      <Badge className="bg-orange-600 hover:bg-orange-700">
                        <Shield className="h-3 w-3 mr-1" />
                        RetenciÃ³n Legal
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">
                        Normal
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowLegalHold(true);
                      }}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      RetenciÃ³n Legal
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedItem && (
        <LegalHoldControls
          item={selectedItem}
          isOpen={showLegalHold}
          onClose={() => {
            setShowLegalHold(false);
            setSelectedItem(null);
          }}
          onSuccess={handleLegalHoldSuccess}
        />
      )}
    </>
  );
}
