'use client';

import { useEffect, useState } from 'react';
import { Mail, ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

const supabase = createClient();

interface InboundEmailLog {
  id: number;
  resend_email_id: string | null;
  from_address: string;
  to_addresses: string[];
  subject: string | null;
  received_at: string;
  forwarded_to: string[];
  forwarding_status: 'success' | 'partial_failure' | 'failed';
  error_details: any;
}

export default function InboundEmailLogs() {
  const [logs, setLogs] = useState<InboundEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LOGS_PER_PAGE = 25;

  const fetchLogs = async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_get_inbound_email_logs', {
        p_limit: LOGS_PER_PAGE,
        p_offset: page * LOGS_PER_PAGE,
      });

      if (rpcError) throw rpcError;

      setLogs((data as unknown as InboundEmailLog[]) || []);
      setHasMore(data && data.length === LOGS_PER_PAGE);
    } catch (err) {
      logger.error('Error fetching email logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'partial_failure':
        return <AlertCircle size={18} className="text-yellow-400" />;
      case 'failed':
        return <XCircle size={18} className="text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            Success
          </span>
        );
      case 'partial_failure':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
            Partial Failure
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC000]"></div>
        <p className="text-zinc-400 mt-4">Loading email logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-800/50 rounded-lg border border-zinc-700">
        <Mail className="mx-auto text-zinc-600 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-white mb-2">No Inbound Emails</h3>
        <p className="text-zinc-400 text-sm">
          Inbound emails will appear here once they are received and forwarded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400 w-8"></th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">From</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Subject</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Forwarded To</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <>
                <tr
                  key={log.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer"
                  onClick={() => toggleRow(log.id)}
                >
                  <td className="py-3 px-4">
                    {log.error_details && (
                      <button className="text-zinc-400 hover:text-white transition-colors">
                        {expandedRow === log.id ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-sm">
                    {formatDate(log.received_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-zinc-400" />
                      <span className="text-white text-sm">{log.from_address}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white text-sm">
                    {log.subject || '(No Subject)'}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-sm">
                    {log.forwarded_to.length > 0 ? (
                      <span>{log.forwarded_to.length} address{log.forwarded_to.length !== 1 ? 'es' : ''}</span>
                    ) : (
                      <span className="text-zinc-600">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(log.forwarding_status)}</td>
                </tr>
                {expandedRow === log.id && log.error_details && (
                  <tr className="bg-zinc-800/50">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-white mb-2">Error Details</h4>
                            <div className="bg-zinc-900 rounded p-3 space-y-2">
                              {log.error_details.failed_addresses && (
                                <div>
                                  <span className="text-xs text-zinc-400">Failed Addresses:</span>
                                  <div className="text-sm text-red-400 mt-1">
                                    {log.error_details.failed_addresses.join(', ')}
                                  </div>
                                </div>
                              )}
                              {log.error_details.errors && (
                                <div>
                                  <span className="text-xs text-zinc-400">Errors:</span>
                                  <pre className="text-xs text-red-400 mt-1 overflow-x-auto">
                                    {JSON.stringify(log.error_details.errors, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.error_details.error && (
                                <div>
                                  <span className="text-xs text-zinc-400">Error:</span>
                                  <div className="text-sm text-red-400 mt-1">
                                    {log.error_details.error}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {log.forwarded_to.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-zinc-400 mb-1">Successfully Forwarded To:</h4>
                            <div className="text-sm text-green-400">
                              {log.forwarded_to.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <div className="text-sm text-zinc-400">
          Showing {currentPage * LOGS_PER_PAGE + 1} to {currentPage * LOGS_PER_PAGE + logs.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={!hasMore}
            className="px-4 py-2 text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
