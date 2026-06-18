'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserLink } from '@/components/ui/user-link';
import { useReportDetails } from '@/hooks/admin/useReportDetails';
import { useResolveReport } from '@/hooks/admin/useResolveReport';
import { useChatContext } from '@/hooks/admin/useChatContext';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { toast } from 'sonner';
import {
  AlertTriangle,
  X,
  Trash,
  Ban,
  ExternalLink,
  MessageCircle,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import Link from '@/components/ui/link';
import { logger } from '@/lib/logger';

interface ReportDetailModalProps {
  reportId: string;
  onClose: () => void;
  onResolved: () => void;
  readOnly?: boolean;
}

interface ReportMeta {
  reporter_id: string;
  status: string;
  admin_notes: string | null;
  admin_id: string | null;
  resolved_at: string | null;
}

export function ReportDetailModal({
  reportId,
  onClose,
  onResolved,
  readOnly = false,
}: ReportDetailModalProps) {
  const supabase = useSupabaseClient();
  const { details, loading, error } = useReportDetails(reportId);
  const { resolveReport, loading: resolving } = useResolveReport();
  const { messages: chatMessages, loading: chatLoading, error: chatError, fetchChat, clearChat } = useChatContext();
  const [adminNotes, setAdminNotes] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [reportMeta, setReportMeta] = useState<ReportMeta | null>(null);
  const [adminNickname, setAdminNickname] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const metaFetchedRef = useRef(false);

  // Fetch report metadata (reporter_id, status, admin_notes) directly from the reports table
  const fetchReportMeta = useCallback(async () => {
    if (metaFetchedRef.current) return;
    metaFetchedRef.current = true;

    try {
      const { data, error: metaError } = await supabase
        .from('reports')
        .select('reporter_id, status, admin_notes, admin_id, resolved_at')
        .eq('id', parseInt(reportId))
        .single();

      if (metaError) {
        logger.error('Error fetching report meta:', metaError);
        return;
      }

      if (data) {
        const meta = data as unknown as ReportMeta;
        setReportMeta(meta);

        // Fetch admin nickname if there's an admin_id
        if (meta.admin_id) {
          const { data: adminData } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', meta.admin_id)
            .single();

          if (adminData) {
            setAdminNickname(adminData.nickname);
          }
        }
      }
    } catch (err) {
      logger.error('Error in fetchReportMeta:', err);
    }
  }, [supabase, reportId]);

  useEffect(() => {
    fetchReportMeta();
  }, [fetchReportMeta]);

  // Fetch chat context when we have details for user-type reports
  useEffect(() => {
    if (details?.report?.entity_type === 'user' && reportMeta?.reporter_id && details.report.entity_id) {
      fetchChat(reportMeta.reporter_id, details.report.entity_id);
    }
    return () => {
      clearChat();
    };
  }, [details?.report?.entity_type, details?.report?.entity_id, reportMeta?.reporter_id, fetchChat, clearChat]);

  // Auto-scroll chat container
  useEffect(() => {
    if (chatContainerRef.current && chatMessages.length > 0) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const isReadOnly = readOnly || reportMeta?.status === 'resolved' || reportMeta?.status === 'dismissed';

  const handleResolve = async (
    action: 'dismiss' | 'remove_content' | 'suspend_user'
  ) => {
    if (confirming !== action) {
      setConfirming(action);
      return;
    }

    if (!adminNotes.trim()) {
      toast.error('Please provide a reason for this action');
      return;
    }

    try {
      await resolveReport(reportId, action, adminNotes);
      toast.success('Report resolved successfully');
      onResolved();
      onClose();
    } catch (error) {
      logger.error('Error resolving report:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to resolve report: ${errorMessage}`);
    } finally {
      setConfirming(null);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-white dark:bg-[#1F2937] border-2 border-black max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Loading report</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Fetching report details. This dialog will update once the report
              is ready.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!details) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-white dark:bg-[#1F2937] border-2 border-black">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Unable to load report
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              We could not fetch the details for this report. Please try again
              or refresh the page.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-red-500">Failed to load report details</p>
            {error && <p className="text-gray-400 text-sm mt-2">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const report = details.report;
  const content = details.reported_content as Record<
    string,
    string | number | boolean | null | undefined
  >;
  const history = details.reported_user_history;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-[#1F2937] border-2 border-black max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Report Details
            {isReadOnly && (
              <Badge className="ml-2 bg-gray-600 text-white text-xs">
                Solo lectura
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            {isReadOnly
              ? 'Este reporte ya fue procesado. Puedes ver los detalles pero no modificarlo.'
              : 'Review the reported content, add administration notes, and choose the appropriate action.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resolution info for read-only reports */}
          {isReadOnly && reportMeta && (
            <div className="border-2 border-gray-600/50 rounded-md p-4 space-y-2 bg-[#374151]/40">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-5 w-5 text-green-400" />
                <h3 className="font-bold text-white">Resolución</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Estado</p>
                  <div className="mt-1">
                    {reportMeta.status === 'resolved' ? (
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Resuelto
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/30">
                        <XCircle className="mr-1 h-3 w-3" />
                        Descartado
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-gray-400">Resuelto por</p>
                  <p className="text-white font-medium mt-1">{adminNickname || 'Admin'}</p>
                </div>
                {reportMeta.resolved_at && (
                  <div className="col-span-2">
                    <p className="text-gray-400">Fecha de resolución</p>
                    <p className="text-white mt-1">{formatDate(reportMeta.resolved_at)}</p>
                  </div>
                )}
              </div>
              {reportMeta.admin_notes && (
                <div className="mt-3 bg-[#1F2937]/60 border border-gray-600/30 rounded-md p-3">
                  <p className="text-xs text-gray-400 mb-1">Notas del admin</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{reportMeta.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Report Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500 text-white">
                {report.entity_type}
              </Badge>
              <Badge variant="outline">{report.reason}</Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Reported by{' '}
              <span className="text-gray-900 dark:text-white font-bold">
                {report.reporter_nickname}
              </span>{' '}
              on {new Date(report.created_at).toLocaleString()}
            </p>
            {report.description && (
              <div className="bg-gray-100 dark:bg-[#374151] p-3 rounded-md">
                <p className="text-gray-600 dark:text-gray-300 text-sm">{report.description}</p>
              </div>
            )}
          </div>

          {/* Reported Content */}
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Reported Content</h3>
              {/* View Content Link */}
              {report.entity_type === 'user' && report.entity_id && (
                <Link
                  href={`/users/${report.entity_id}`}
                  target="_blank"
                  className="text-gold hover:text-gold-light flex items-center gap-1 text-sm"
                >
                  View Profile <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              {report.entity_type === 'listing' && report.entity_id && (
                <Link
                  href={`/marketplace/${report.entity_id}`}
                  target="_blank"
                  className="text-gold hover:text-gold-light flex items-center gap-1 text-sm"
                >
                  View Listing <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              {report.entity_type === 'template' && report.entity_id && (
                <Link
                  href={`/templates/${report.entity_id}`}
                  target="_blank"
                  className="text-gold hover:text-gold-light flex items-center gap-1 text-sm"
                >
                  View Template <ExternalLink className="h-4 w-4" />
                </Link>
              )}
            </div>

            {report.entity_type === 'user' && content.nickname && (
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">User:</span>{' '}
                  {content.nickname}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">Email:</span> {content.email}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">Rating:</span>{' '}
                  {typeof content.rating_avg === 'number'
                    ? content.rating_avg.toFixed(1)
                    : '0.0'}{' '}
                  ⭐
                </p>
                {content.is_suspended && (
                  <Badge className="bg-red-600 text-white">Suspended</Badge>
                )}
              </div>
            )}

            {report.entity_type === 'listing' && content.title && (
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">Title:</span> {content.title}
                </p>
                {content.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{content.description}</p>
                )}
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>{' '}
                  {content.status}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">By:</span>{' '}
                  <UserLink
                    userId={String(content.user_id || '')}
                    nickname={String(content.user_nickname || '')}
                    variant="subtle"
                    disabled={!content.user_id}
                  />
                </p>
              </div>
            )}

            {report.entity_type === 'template' && content.title && (
              <div className="space-y-2">
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">Title:</span> {content.title}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">Author:</span>{' '}
                  <UserLink
                    userId={String(content.author_id || '')}
                    nickname={String(content.author_nickname || '')}
                    variant="subtle"
                    disabled={!content.author_id}
                  />
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">Rating:</span>{' '}
                  {typeof content.rating_avg === 'number'
                    ? content.rating_avg.toFixed(1)
                    : '0.0'}{' '}
                  ⭐
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="text-gray-600 dark:text-gray-400">Public:</span>{' '}
                  {content.is_public ? 'Yes' : 'No'}
                </p>
              </div>
            )}
          </div>

          {/* Chat Conversation Section */}
          {report.entity_type === 'user' && (
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-gold" />
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Conversación del Chat
                </h3>
                {chatMessages.length > 0 && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    {chatMessages.length} mensajes
                  </Badge>
                )}
              </div>

              {chatLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin h-6 w-6 border-2 border-gold border-r-transparent rounded-full" />
                  <span className="ml-2 text-gray-400 text-sm">Cargando chat...</span>
                </div>
              )}

              {chatError && (
                <p className="text-red-400 text-sm">Error al cargar el chat: {chatError}</p>
              )}

              {!chatLoading && !chatError && chatMessages.length === 0 && (
                <p className="text-gray-500 text-sm italic py-4 text-center">
                  No se encontraron mensajes entre estos usuarios
                </p>
              )}

              {!chatLoading && chatMessages.length > 0 && (
                <div
                  ref={chatContainerRef}
                  className="max-h-[400px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                >
                  {chatMessages.map((msg, idx) => {
                    const isReporter = msg.sender_id === reportMeta?.reporter_id;
                    const showDateSep =
                      idx === 0 ||
                      new Date(msg.created_at).toDateString() !==
                        new Date(chatMessages[idx - 1].created_at).toDateString();

                    // Show chat_type badge when it changes
                    const showChatType =
                      idx === 0 || msg.chat_type !== chatMessages[idx - 1].chat_type;

                    return (
                      <div key={msg.id}>
                        {showDateSep && (
                          <div className="flex items-center justify-center my-3">
                            <div className="h-px bg-gray-600 flex-1" />
                            <span className="px-3 text-xs text-gray-500">
                              {new Date(msg.created_at).toLocaleDateString()}
                            </span>
                            <div className="h-px bg-gray-600 flex-1" />
                          </div>
                        )}

                        {showChatType && (
                          <div className="flex justify-center my-2">
                            <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                              {msg.chat_type === 'marketplace' ? 'Marketplace' : msg.chat_type === 'match' ? 'Match' : msg.chat_type}
                            </Badge>
                          </div>
                        )}

                        {msg.is_system ? (
                          /* System message */
                          <div className="flex justify-center my-2">
                            <p className="text-xs text-gray-500 italic bg-gray-800/40 rounded-full px-4 py-1">
                              {msg.message}
                            </p>
                          </div>
                        ) : (
                          /* User message */
                          <div
                            className={`flex ${isReporter ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-xl px-3 py-2 ${
                                isReporter
                                  ? 'bg-gold/20 border border-gold/30 text-white'
                                  : 'bg-gray-700/60 border border-gray-600/30 text-gray-200'
                              }`}
                            >
                              <p className={`text-[10px] font-medium mb-0.5 ${
                                isReporter ? 'text-gold' : 'text-gray-400'
                              }`}>
                                {msg.sender_nickname}
                                {isReporter && (
                                  <span className="ml-1 text-[9px] text-gold/60">(reporter)</span>
                                )}
                              </p>
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                              {msg.image_url && (
                                <a
                                  href={msg.image_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  Ver imagen
                                </a>
                              )}
                              <p className="text-[10px] text-gray-500 mt-0.5 text-right">
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* User History (if applicable) */}
          {history && (
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white">User History</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Total Reports Received</p>
                  <p className="text-gray-900 dark:text-white font-bold">
                    {history.total_reports_received}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Total Listings</p>
                  <p className="text-gray-900 dark:text-white font-bold">
                    {history.total_listings}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Templates Created</p>
                  <p className="text-gray-900 dark:text-white font-bold">
                    {history.total_templates_created}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Rating Average</p>
                  <p className="text-gray-900 dark:text-white font-bold">
                    {history.rating_avg &&
                    typeof history.rating_avg === 'number'
                      ? history.rating_avg.toFixed(1)
                      : '0.0'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Admin Notes & Actions - Only show when NOT read-only */}
          {!isReadOnly && (
            <>
              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-900 dark:text-white">
                  Admin Notes (Required)
                </Label>
                <Textarea
                  id="notes"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Explain your decision..."
                  rows={3}
                  className="bg-white dark:bg-[#374151] border-2 border-black text-gray-900 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => handleResolve('dismiss')}
                  disabled={resolving || !adminNotes.trim()}
                  variant="outline"
                  className="w-full"
                >
                  <X className="mr-2 h-4 w-4" />
                  {confirming === 'dismiss'
                    ? 'Click again to confirm'
                    : 'Dismiss Report'}
                </Button>

                {/* Show Remove Content button only for listings and templates */}
                {(report.entity_type === 'listing' || report.entity_type === 'template') && (
                  <Button
                    onClick={() => handleResolve('remove_content')}
                    disabled={resolving || !adminNotes.trim()}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    {confirming === 'remove_content'
                      ? 'Click again to confirm'
                      : 'Remove Content'}
                  </Button>
                )}

                {/* Show Suspend User button for all report types */}
                <Button
                  onClick={() => handleResolve('suspend_user')}
                  disabled={resolving || !adminNotes.trim()}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  {confirming === 'suspend_user'
                    ? 'Click again to confirm'
                    : report.entity_type === 'user'
                      ? 'Suspend User'
                      : 'Suspend Content Owner'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
