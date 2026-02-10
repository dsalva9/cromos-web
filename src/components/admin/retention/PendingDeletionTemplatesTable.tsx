'use client';

import { useState } from 'react';
import { useAdminPendingDeletionTemplates } from '@/hooks/admin/useAdminPendingDeletionTemplates';
import { useAdminPermanentDelete } from '@/hooks/admin/useAdminPermanentDelete';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, FileText, AlertTriangle, Trash2, Shield, ExternalLink, Star } from 'lucide-react';
import Link from '@/components/ui/link';
import { LegalHoldControls } from './LegalHoldControls';

export function PendingDeletionTemplatesTable() {
  const { templates, loading, error, refetch } = useAdminPendingDeletionTemplates();
  const { permanentlyDeleteTemplate, loading: deleteLoading } = useAdminPermanentDelete();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    templateId: string;
    title: string;
  }>({
    isOpen: false,
    templateId: '',
    title: '',
  });
  const [legalHoldDialog, setLegalHoldDialog] = useState<{
    isOpen: boolean;
    item: any | null;
  }>({
    isOpen: false,
    item: null,
  });

  const handleDeleteClick = (templateId: string, title: string) => {
    setConfirmDialog({ isOpen: true, templateId, title });
  };

  const handleConfirmDelete = async () => {
    const result = await permanentlyDeleteTemplate(
      confirmDialog.templateId,
      confirmDialog.title
    );
    if (result) {
      setConfirmDialog({ isOpen: false, templateId: '', title: '' });
      refetch();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFC000]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
        <p>Error loading pending deletion templates: {error}</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No templates pending deletion</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Scheduled For</TableHead>
              <TableHead>Days Remaining</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => {
              const hasLegalHold = template.legal_hold_until !== null;
              const isArchived = template.author_id === null;

              return (
                <TableRow key={template.template_id}>
                  <TableCell className="font-medium text-white">{template.title}</TableCell>
                  <TableCell>
                    {isArchived ? (
                      <span className="text-sm text-gray-500 italic">[Archived]</span>
                    ) : template.author_id ? (
                      <Link
                        href={`/users/${template.author_id}`}
                        className="text-sm text-blue-400 hover:underline"
                      >
                        {template.author_nickname || 'Unknown'}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {template.rating_avg !== null ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-white">
                          {Number(template.rating_avg).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({template.rating_count})
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No ratings</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {formatDate(template.scheduled_for)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold ${template.days_remaining <= 7
                          ? 'text-red-500'
                          : template.days_remaining <= 30
                            ? 'text-orange-500'
                            : 'text-gray-400'
                        }`}
                    >
                      {template.days_remaining} days
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400 max-w-xs truncate">
                    {template.deletion_reason || '-'}
                  </TableCell>
                  <TableCell>
                    {template.deletion_type === 'user' ? (
                      <Badge variant="outline" className="text-blue-400">
                        User-Deleted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-400">
                        Admin-Deleted
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {hasLegalHold ? (
                      <Badge className="bg-orange-600 hover:bg-orange-700">
                        <Shield className="h-3 w-3 mr-1" />
                        Legal Hold
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">
                        Scheduled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/templates/${template.template_id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setLegalHoldDialog({
                            isOpen: true,
                            item: {
                              id: template.retention_schedule_id,
                              entity_type: 'template',
                              entity_id: template.template_id,
                              scheduled_for: template.scheduled_for,
                              legal_hold_until: template.legal_hold_until,
                              reason: template.deletion_reason,
                            },
                          })
                        }
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(String(template.template_id), template.title)}
                        disabled={hasLegalHold || deleteLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, templateId: '', title: '' })}>
        <DialogContent className="bg-[#374151] border-2 border-black text-white">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              This action is irreversible. The template and all associated data will be permanently deleted. User copies will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-[#1F2937] rounded-md border border-gray-700">
            <p className="text-white font-semibold">Template: {confirmDialog.title}</p>
            <p className="text-gray-400 text-sm">ID: {confirmDialog.templateId}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ isOpen: false, templateId: '', title: '' })}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Permanently Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {legalHoldDialog.item && (
        <LegalHoldControls
          item={legalHoldDialog.item}
          isOpen={legalHoldDialog.isOpen}
          onClose={() => setLegalHoldDialog({ isOpen: false, item: null })}
          onSuccess={() => {
            refetch();
            setLegalHoldDialog({ isOpen: false, item: null });
          }}
        />
      )}
    </>
  );
}
