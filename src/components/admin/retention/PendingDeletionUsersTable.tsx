'use client';

import { useState } from 'react';
import { useAdminPendingDeletionUsers } from '@/hooks/admin/useAdminPendingDeletionUsers';
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
import { Loader2, User, AlertTriangle, Trash2, Shield } from 'lucide-react';
import Link from 'next/link';
import { LegalHoldControls } from './LegalHoldControls';

export function PendingDeletionUsersTable() {
  const { users, loading, error, refetch } = useAdminPendingDeletionUsers();
  const { permanentlyDeleteUser, loading: deleteLoading } = useAdminPermanentDelete();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    userId: string;
    nickname: string;
    email: string;
  }>({
    isOpen: false,
    userId: '',
    nickname: '',
    email: '',
  });
  const [legalHoldDialog, setLegalHoldDialog] = useState<{
    isOpen: boolean;
    item: any | null;
  }>({
    isOpen: false,
    item: null,
  });

  const handleDeleteClick = (userId: string, nickname: string, email: string) => {
    setConfirmDialog({ isOpen: true, userId, nickname, email });
  };

  const handleConfirmDelete = async () => {
    const result = await permanentlyDeleteUser(
      confirmDialog.userId,
      confirmDialog.nickname
    );
    if (result) {
      setConfirmDialog({ isOpen: false, userId: '', nickname: '', email: '' });
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
        <p>Error loading pending deletion users: {error}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No users pending deletion</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Scheduled For</TableHead>
              <TableHead>Days Remaining</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Initiated By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const hasLegalHold = user.legal_hold_until !== null;

              return (
                <TableRow key={user.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.nickname}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      <span className="font-medium text-white">{user.nickname}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">{user.email}</TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {formatDate(user.scheduled_for)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-semibold ${
                        user.days_remaining <= 7
                          ? 'text-red-500'
                          : user.days_remaining <= 30
                            ? 'text-orange-500'
                            : 'text-gray-400'
                      }`}
                    >
                      {user.days_remaining} days
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400 max-w-xs truncate">
                    {user.deletion_reason || '-'}
                  </TableCell>
                  <TableCell>
                    {user.initiated_by_type === 'user' ? (
                      <span className="text-sm text-blue-400">User</span>
                    ) : user.initiated_by_type === 'admin' ? (
                      <span className="text-sm text-orange-400">Admin</span>
                    ) : (
                      <span className="text-sm text-gray-500">System</span>
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
                      <Link href={`/users/${user.user_id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setLegalHoldDialog({
                            isOpen: true,
                            item: {
                              id: user.retention_schedule_id,
                              entity_type: 'user',
                              entity_id: user.user_id,
                              scheduled_for: user.scheduled_for,
                              legal_hold_until: user.legal_hold_until,
                              reason: user.deletion_reason,
                            },
                          })
                        }
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          handleDeleteClick(user.user_id, user.nickname, user.email)
                        }
                        disabled={hasLegalHold || deleteLoading}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Now
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, userId: '', nickname: '', email: '' })}>
        <DialogContent className="bg-[#374151] border-2 border-black text-white">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              This action is irreversible. All user data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-[#1F2937] rounded-md border border-gray-700">
            <p className="text-white font-semibold">User: {confirmDialog.nickname}</p>
            <p className="text-gray-400 text-sm">Email: {confirmDialog.email}</p>
            <p className="text-gray-400 text-sm">ID: {confirmDialog.userId}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ isOpen: false, userId: '', nickname: '', email: '' })
              }
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
