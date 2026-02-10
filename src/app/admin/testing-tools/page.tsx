'use client';

import { useState } from 'react';
import { useUserSearch } from '@/hooks/admin/useUserSearch';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import Link from '@/components/ui/link';
import { User, Search, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import { useDebounce } from '@/hooks/useDebounce';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type ResetResult = {
  success: boolean;
  user_id: string;
  user_email: string;
  previous_nickname: string | null;
  admin_status_preserved: boolean;
  deleted_counts: Record<string, number>;
  message: string;
};

function TestingToolsContent() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended' | 'pending_deletion'>('all');
  const debouncedQuery = useDebounce(query, 500);
  const supabase = useSupabaseClient();

  const { users, loading, error, refetch } = useUserSearch(debouncedQuery, status);

  const [resetDialog, setResetDialog] = useState<{
    open: boolean;
    userId: string | null;
    nickname: string | null;
    email: string | null;
    isAdmin: boolean;
  }>({
    open: false,
    userId: null,
    nickname: null,
    email: null,
    isAdmin: false,
  });

  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    result: ResetResult | null;
  }>({
    open: false,
    result: null,
  });

  const [resetting, setResetting] = useState(false);

  const handleOpenResetDialog = (userId: string, nickname: string, email: string, isAdmin: boolean) => {
    setResetDialog({
      open: true,
      userId,
      nickname,
      email,
      isAdmin,
    });
  };

  const handleCloseResetDialog = () => {
    setResetDialog({
      open: false,
      userId: null,
      nickname: null,
      email: null,
      isAdmin: false,
    });
  };

  const handleResetUser = async () => {
    if (!resetDialog.userId) return;

    setResetting(true);
    try {
      const { data, error } = await supabase.rpc('admin_reset_user_for_testing', {
        p_user_id: resetDialog.userId,
      });

      if (error) throw error;

      const result = data as unknown as ResetResult;

      toast.success('User reset successfully');
      handleCloseResetDialog();
      setResultDialog({
        open: true,
        result,
      });

      // Refetch users to update the list
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset user');
    } finally {
      setResetting(false);
    }
  };

  const handleCloseResultDialog = () => {
    setResultDialog({
      open: false,
      result: null,
    });
  };

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Warning */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Testing Tools
          </h1>
          <div className="flex items-start gap-3 bg-orange-900/50 border-2 border-orange-500 rounded-lg p-4 mt-4">
            <AlertTriangle className="h-6 w-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-200 font-bold mb-1">
                ⚠️ TESTING ENVIRONMENT ONLY
              </p>
              <p className="text-orange-300 text-sm">
                These tools are for testing purposes only. Resetting a user will <strong>permanently delete</strong> all their content including:
                marketplace listings, trades, chat messages, ratings, templates, badges, XP, and all progress. This action cannot be undone.
                Only use this in development/testing environments.
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <ModernCard className="mb-6">
          <ModernCardContent className="p-6 space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label className="text-white">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by nickname or email..."
                  className="pl-10 bg-[#374151] border-2 border-black text-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-white">Status Filter</Label>
              <Select value={status} onValueChange={(v: 'all' | 'active' | 'suspended' | 'pending_deletion') => setStatus(v)}>
                <SelectTrigger className="bg-[#374151] border-2 border-black text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="suspended">Suspended Only</SelectItem>
                  <SelectItem value="pending_deletion">Pending Deletion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            Error loading users: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
          </div>
        )}

        {/* Results */}
        {!loading && users.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg">
              No users found
            </p>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-4">
          {users.map((user) => (
            <ModernCard key={user.user_id}>
              <ModernCardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {(() => {
                      const avatarUrl = resolveAvatarUrl(user.avatar_url, supabase);
                      return avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={user.nickname}
                          width={64}
                          height={64}
                          className="rounded-full border-2 border-black"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-[#FFC000] border-2 border-black flex items-center justify-center">
                          <User className="h-8 w-8 text-black" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/users/${user.user_id}`}>
                            <h3 className="font-bold text-white text-lg hover:text-[#FFC000] transition-colors">
                              {user.nickname}
                            </h3>
                          </Link>
                          {user.is_admin && (
                            <Badge className="bg-red-600 text-white">Admin</Badge>
                          )}
                          {user.is_pending_deletion ? (
                            <Badge className="bg-orange-600 text-white">Pending Deletion</Badge>
                          ) : user.is_suspended && (
                            <Badge className="bg-gray-600 text-white">Suspended</Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Rating</p>
                        <p className="text-white font-bold">
                          {user.rating_avg.toFixed(1)} ⭐ ({user.rating_count})
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Active Listings</p>
                        <p className="text-white font-bold">{user.active_listings_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Reports Received</p>
                        <p className="text-white font-bold">{user.reports_received_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Joined</p>
                        <p className="text-white font-bold">
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Link href={`/users/${user.user_id}`}>
                        <Button size="sm" variant="outline">
                          View Profile
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        onClick={() => handleOpenResetDialog(user.user_id, user.nickname, user.email, user.is_admin)}
                        className="bg-red-700 hover:bg-red-600"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset User
                      </Button>
                    </div>
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialog.open} onOpenChange={(open) => !open && handleCloseResetDialog()}>
        <DialogContent className="bg-[#2D3748] border-4 border-black text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Reset User - Confirmation Required
            </DialogTitle>
            <DialogDescription className="text-gray-300 mt-2">
              This is a destructive action that cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4">
              <p className="text-red-200 font-bold mb-2">
                You are about to reset:
              </p>
              <p className="text-white text-lg">
                <strong>{resetDialog.nickname}</strong> ({resetDialog.email})
              </p>
            </div>

            <div className="bg-orange-900/30 border-2 border-orange-500 rounded-lg p-4">
              <p className="text-orange-200 font-bold mb-2">
                The following data will be permanently deleted:
              </p>
              <ul className="text-orange-100 text-sm space-y-1 list-disc list-inside">
                <li>All marketplace listings</li>
                <li>All trade proposals and chat messages</li>
                <li>All ratings (given and received)</li>
                <li>All templates created by this user</li>
                <li>All template copies and progress</li>
                <li>All badges and XP progress</li>
                <li>All favorites and social connections</li>
                <li>All notifications</li>
                <li>Profile data (nickname, avatar will be reset to defaults)</li>
              </ul>
            </div>

            <div className="bg-blue-900/30 border-2 border-blue-500 rounded-lg p-4">
              <p className="text-blue-200 font-bold mb-2">
                What will be preserved:
              </p>
              <ul className="text-blue-100 text-sm space-y-1 list-disc list-inside">
                <li>The user account itself (can still log in)</li>
                <li>Email address</li>
                {resetDialog.isAdmin && (
                  <li className="font-bold text-blue-200">Admin privileges (will remain admin)</li>
                )}
              </ul>
            </div>

            {resetDialog.isAdmin && (
              <div className="bg-purple-900/30 border-2 border-purple-500 rounded-lg p-4">
                <p className="text-purple-200 font-bold mb-2">
                  ⚡ Admin User Notice:
                </p>
                <p className="text-purple-100 text-sm">
                  This user is an admin. Their admin privileges will be <strong>preserved</strong> after reset.
                  They will retain admin access but all their content and progress will be deleted.
                </p>
              </div>
            )}

            <p className="text-gray-300 text-sm italic">
              This action is intended for testing purposes only. Use with caution.
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleCloseResetDialog}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetUser}
              disabled={resetting}
              className="bg-red-700 hover:bg-red-600"
            >
              {resetting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-r-transparent rounded-full mr-2" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Yes, Reset User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={resultDialog.open} onOpenChange={(open) => !open && handleCloseResultDialog()}>
        <DialogContent className="bg-[#2D3748] border-4 border-black text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-green-400">
              ✓ User Reset Complete
            </DialogTitle>
          </DialogHeader>

          {resultDialog.result && (
            <div className="space-y-4 py-4">
              <div className="bg-green-900/30 border-2 border-green-500 rounded-lg p-4">
                <p className="text-green-200 mb-2">
                  Successfully reset user:
                </p>
                <p className="text-white">
                  <strong>{resultDialog.result.previous_nickname || 'Unknown'}</strong> ({resultDialog.result.user_email})
                </p>
              </div>

              <div className="bg-[#374151] rounded-lg p-4">
                <p className="text-white font-bold mb-3">
                  Deleted Data Summary:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(resultDialog.result.deleted_counts).map(([key, count]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-300">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {resultDialog.result.admin_status_preserved && (
                <div className="bg-purple-900/30 border-2 border-purple-500 rounded-lg p-4">
                  <p className="text-purple-200 font-bold mb-1">
                    ⚡ Admin Status Preserved
                  </p>
                  <p className="text-purple-100 text-sm">
                    This user retains their admin privileges and can still access the admin panel.
                  </p>
                </div>
              )}

              <p className="text-gray-300 text-sm">
                The user account is now in its initial state{resultDialog.result.admin_status_preserved ? ' (with admin privileges preserved)' : ', as if they just signed up'}.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleCloseResultDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminTestingToolsPage() {
  return (
    <AdminGuard>
      <TestingToolsContent />
    </AdminGuard>
  );
}
