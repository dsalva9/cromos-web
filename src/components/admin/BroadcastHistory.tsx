'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, Mail } from 'lucide-react';

interface BroadcastLogEntry {
  id: string;
  resend_broadcast_id: string;
  subject: string;
  sent_by: string;
  recipient_count: number | null;
  status: string;
  error_details: string | null;
  created_at: string;
  profiles?: { nickname: string } | null;
}

export function BroadcastHistory() {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.broadcasts');
  const [logs, setLogs] = useState<BroadcastLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcast_log')
        .select('*, profiles:sent_by(nickname)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data as BroadcastLogEntry[]) || []);
    } catch {
      // Silently handle — table may not exist yet
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLogs();

    // Listen for broadcast-sent events from BroadcastComposer
    const handler = () => fetchLogs();
    window.addEventListener('broadcast-sent', handler);
    return () => window.removeEventListener('broadcast-sent', handler);
  }, [fetchLogs]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">{t('history')}</h2>

      <div className="bg-[#2D3748] border-2 border-black rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">{t('noHistory')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A202C] text-gray-400 text-xs uppercase">
                  <th className="text-left px-4 py-3">{t('date')}</th>
                  <th className="text-left px-4 py-3">{t('subject')}</th>
                  <th className="text-center px-4 py-3">{t('recipients')}</th>
                  <th className="text-center px-4 py-3">{t('status')}</th>
                  <th className="text-left px-4 py-3">{t('sentBy')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-[#374151] transition-colors">
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap text-xs">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white font-medium max-w-xs truncate">
                      {log.subject}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {log.recipient_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t('statusSent')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400" title={log.error_details || undefined}>
                          <XCircle className="h-3.5 w-3.5" />
                          {t('statusFailed')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {log.profiles?.nickname || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
