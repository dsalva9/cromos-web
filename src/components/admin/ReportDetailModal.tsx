'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';
import { AlertTriangle, X, Trash, Ban, ExternalLink } from 'lucide-react';
import Link from '@/components/ui/link';

interface ReportDetailModalProps {
  reportId: string;
  onClose: () => void;
  onResolved: () => void;
}

export function ReportDetailModal({
  reportId,
  onClose,
  onResolved,
}: ReportDetailModalProps) {
  const { details, loading, error } = useReportDetails(reportId);
  const { resolveReport, loading: resolving } = useResolveReport();
  const [adminNotes, setAdminNotes] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

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
      console.error('Error resolving report:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to resolve report: ${errorMessage}`);
    } finally {
      setConfirming(null);
    }
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
            <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
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
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Review the reported content, add administration notes, and choose
            the appropriate action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                  className="text-[#FFC000] hover:text-[#FFD700] flex items-center gap-1 text-sm"
                >
                  View Profile <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              {report.entity_type === 'listing' && report.entity_id && (
                <Link
                  href={`/marketplace/${report.entity_id}`}
                  target="_blank"
                  className="text-[#FFC000] hover:text-[#FFD700] flex items-center gap-1 text-sm"
                >
                  View Listing <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              {report.entity_type === 'template' && report.entity_id && (
                <Link
                  href={`/templates/${report.entity_id}`}
                  target="_blank"
                  className="text-[#FFC000] hover:text-[#FFD700] flex items-center gap-1 text-sm"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
