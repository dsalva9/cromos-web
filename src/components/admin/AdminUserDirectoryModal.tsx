'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from '@/components/ui/link';
import Image from 'next/image';
import {
  User,
  Star,
  Ban,
  CheckCircle,
  AlertTriangle,
  Mail,
  Shield,
  ExternalLink,
  Clock,
  MessageSquare,
  Package,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { useSuspendUser } from '@/hooks/admin/useSuspendUser';
import { SendEmailModal } from './SendEmailModal';
import { UserFullInfo, UserReportItem } from '@/hooks/admin/useAdminRatings';

interface AdminUserDirectoryModalProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onUserUpdated?: () => void;
}

export function AdminUserDirectoryModal({
  userId,
  open,
  onClose,
  onUserUpdated,
}: AdminUserDirectoryModalProps) {
  const supabase = useSupabaseClient();
  const [userInfo, setUserInfo] = useState<UserFullInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingPatron, setTogglingPatron] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const { suspendUser, unsuspendUser, loading: actionLoading } = useSuspendUser();

  const fetchFullInfo = useCallback(async (targetId: string) => {
    try {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('admin_get_user_full_info', {
        p_user_id: targetId,
      });

      if (error) throw error;
      setUserInfo(data as UserFullInfo);
    } catch {
      toast.error('Failed to load user profile information');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!open || !userId) {
      setUserInfo(null);
      return;
    }
    fetchFullInfo(userId);
  }, [open, userId, fetchFullInfo]);

  if (!userId) return null;

  const handleTogglePatron = async () => {
    if (!userInfo) return;
    const actionText = userInfo.is_patron ? 'Revoke' : 'Grant';
    if (!confirm(`${actionText} Patron status for ${userInfo.nickname}?`)) return;

    setTogglingPatron(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_update_patron_status', {
        p_user_id: userInfo.user_id,
        p_is_patron: !userInfo.is_patron,
      });

      if (error) throw error;

      toast.success(`Patron status ${userInfo.is_patron ? 'revoked' : 'granted'} successfully`);
      await fetchFullInfo(userInfo.user_id);
      onUserUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update Patron status');
    } finally {
      setTogglingPatron(false);
    }
  };

  const handleSuspend = async () => {
    if (!userInfo) return;
    const reason = prompt(`Enter reason for suspending ${userInfo.nickname}:`);
    if (!reason) return;

    try {
      await suspendUser(userInfo.user_id, reason);
      toast.success('User suspended successfully');
      await fetchFullInfo(userInfo.user_id);
      onUserUpdated?.();
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleUnsuspend = async () => {
    if (!userInfo) return;
    if (!confirm(`Unsuspend ${userInfo.nickname}? This will restore full account access.`)) return;

    try {
      await unsuspendUser(userInfo.user_id);
      toast.success('User unsuspended successfully');
      await fetchFullInfo(userInfo.user_id);
      onUserUpdated?.();
    } catch {
      toast.error('Failed to unsuspend user');
    }
  };

  const handleForceReset = async () => {
    if (!userInfo) return;
    if (!confirm(`Send password reset email to ${userInfo.nickname}?`)) return;

    try {
      const response = await fetch('/api/admin/force-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userInfo.user_id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send reset email');
      }

      toast.success('Password reset email sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
    }
  };

  const handleMoveToDeletion = async () => {
    if (!userInfo) return;
    if (
      !confirm(
        `Move ${userInfo.nickname} to deletion queue? Account will be permanently deleted in 90 days.`
      )
    )
      return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_move_to_deletion', {
        p_user_id: userInfo.user_id,
      });

      if (error) throw error;

      toast.success('Account moved to deletion queue (90 days)');
      await fetchFullInfo(userInfo.user_id);
      onUserUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move to deletion');
    }
  };

  const handleApproveFlagged = async () => {
    if (!userInfo) return;
    if (!confirm(`Approve ${userInfo.nickname}'s profile and remove the flag?`)) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_approve_flagged_profile', {
        p_user_id: userInfo.user_id,
      });

      if (error) throw error;

      toast.success('Profile approved — flag removed');
      await fetchFullInfo(userInfo.user_id);
      onUserUpdated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve profile');
    }
  };

  const avatarUrl = userInfo ? resolveAvatarUrl(userInfo.avatar_url, supabase) : null;

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'harassment':
        return 'Harassment / Acoso';
      case 'offensive_language':
        return 'Offensive Language / Lenguaje Ofensivo';
      case 'spam':
        return 'Spam';
      case 'misleading_information':
        return 'Misleading / Engaño';
      case 'fake_listing':
        return 'Fake Listing / Anuncio Falso';
      case 'inappropriate_content':
        return 'Inappropriate Content';
      case 'copyright_violation':
        return 'Copyright Violation';
      default:
        return reason.replace(/_/g, ' ');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px]">Pending</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500/20 text-green-300 border border-green-500/40 text-[10px]">Resolved</Badge>;
      case 'dismissed':
        return <Badge className="bg-gray-500/20 text-gray-300 border border-gray-500/40 text-[10px]">Dismissed</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-[#1F2937] border-2 border-black text-white p-0">
          <DialogHeader className="p-6 pb-4 border-b border-gray-700">
            <DialogTitle className="flex items-center justify-between text-xl font-black text-white">
              {userInfo ? (
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={userInfo.nickname}
                      width={52}
                      height={52}
                      className="rounded-full border-2 border-black object-cover"
                    />
                  ) : (
                    <div className="w-[52px] h-[52px] rounded-full bg-gold border-2 border-black flex items-center justify-center">
                      <User className="h-6 w-6 text-black" />
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{userInfo.nickname}</span>
                      <Link href={`/users/${userInfo.user_id}`} target="_blank">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gold hover:text-yellow-400">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      {userInfo.is_admin && <Badge className="bg-red-600 text-white text-xs">Admin</Badge>}
                      {userInfo.is_patron && <Badge className="bg-amber-500 text-white text-xs">☕ Patron</Badge>}
                      {userInfo.is_flagged && <Badge className="bg-amber-600 text-white text-xs animate-pulse">⚠️ Flagged</Badge>}
                      {userInfo.is_pending_deletion ? (
                        <Badge className="bg-orange-600 text-white text-xs">Pending Deletion</Badge>
                      ) : userInfo.is_suspended && (
                        <Badge className="bg-gray-600 text-white text-xs">Suspended</Badge>
                      )}
                      {userInfo.country_code && (
                        <span className="text-xs text-gray-400 font-mono uppercase bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                          {userInfo.country_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-normal mt-0.5">{userInfo.email}</p>
                  </div>
                </div>
              ) : (
                <span>Loading User Details...</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading || !userInfo ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-[#111827] rounded-xl border border-gray-800 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <Star className="h-3 w-3 text-gold fill-gold" /> Rating
                    </p>
                    <p className="text-white font-bold mt-0.5">
                      {userInfo.rating_avg.toFixed(1)} ⭐ ({userInfo.rating_count})
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <Package className="h-3 w-3 text-blue-400" /> Active Listings
                    </p>
                    <p className="text-white font-bold mt-0.5">{userInfo.active_listings_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-green-400" /> Msgs Sent
                    </p>
                    <p className="text-white font-bold mt-0.5">{userInfo.messages_sent}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-purple-400" /> Msgs Received
                    </p>
                    <p className="text-white font-bold mt-0.5">{userInfo.messages_received}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-yellow-400" /> Albums
                    </p>
                    <p className="text-white font-bold mt-0.5">{userInfo.albums_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-400" /> Reports
                    </p>
                    <p
                      className={`font-bold mt-0.5 ${
                        userInfo.reports_received_count > 0 ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {userInfo.reports_received_count}
                    </p>
                  </div>
                </div>

                {/* Moderation Actions (Exact match to normal user directory) */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Moderation Actions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/users/${userInfo.user_id}`} target="_blank">
                      <Button size="sm" variant="outline" className="border-gray-700 text-gray-200 hover:bg-[#374151]">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        View Public Profile
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      onClick={handleTogglePatron}
                      disabled={togglingPatron}
                      className={
                        userInfo.is_patron
                          ? 'bg-[#B45309] hover:bg-[#92400E] text-white font-semibold'
                          : 'bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold'
                      }
                    >
                      ☕ {userInfo.is_patron ? 'Revoke Patron' : 'Grant Patron'}
                    </Button>

                    {!userInfo.is_admin && (
                      <>
                        {userInfo.is_suspended ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleUnsuspend}
                              disabled={actionLoading}
                              className="bg-green-700 hover:bg-green-600 text-white"
                            >
                              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                              Unsuspend
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleMoveToDeletion}
                              disabled={actionLoading || userInfo.is_pending_deletion}
                              className="bg-orange-700 hover:bg-orange-600 text-white disabled:opacity-50"
                            >
                              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                              {userInfo.is_pending_deletion ? 'Already Pending Deletion' : 'Move to Deletion'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={handleSuspend}
                            disabled={actionLoading}
                            className="bg-red-700 hover:bg-red-600 text-white"
                          >
                            <Ban className="mr-1.5 h-3.5 w-3.5" />
                            Suspend
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleForceReset}
                          className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                        >
                          <Mail className="mr-1.5 h-3.5 w-3.5" />
                          Reset Password
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEmailModalOpen(true)}
                          className="border-gold text-gold hover:bg-gold/10"
                        >
                          <Mail className="mr-1.5 h-3.5 w-3.5" />
                          Send Email
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Flagged profile warning banner if flagged */}
                {userInfo.is_flagged && (
                  <div className="p-4 bg-amber-950/40 border border-amber-600 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-sm text-amber-400 font-bold">
                      <Shield className="h-4 w-4" />
                      <span>Flagged Profile — Device match detected</span>
                    </div>
                    {userInfo.flagged_reason && (
                      <p className="text-xs text-amber-300/90">{userInfo.flagged_reason}</p>
                    )}
                    {userInfo.flagged_at && (
                      <p className="text-xs text-gray-400">
                        Flagged at: {new Date(userInfo.flagged_at).toLocaleString()}
                      </p>
                    )}
                    {userInfo.flagged_source_profile_id && (
                      <p className="text-xs text-gray-400">
                        Source profile:{' '}
                        <Link href={`/users/${userInfo.flagged_source_profile_id}`} className="text-gold hover:underline">
                          {userInfo.flagged_source_profile_id.slice(0, 8)}…
                        </Link>
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={handleApproveFlagged}
                        className="bg-green-700 hover:bg-green-600 text-white"
                      >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        Approve Profile (Remove Flag)
                      </Button>
                      {!userInfo.is_suspended && (
                        <Button
                          size="sm"
                          onClick={handleSuspend}
                          disabled={actionLoading}
                          className="bg-red-700 hover:bg-red-600 text-white"
                        >
                          <Ban className="mr-1.5 h-3.5 w-3.5" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Reports Details Section (Text & Cause) ─────────────────────────── */}
                <div className="space-y-3 pt-2 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      <span>Reports Received ({userInfo.reports?.length ?? 0})</span>
                    </h4>
                    {userInfo.reports?.length > 0 && (
                      <Badge className="bg-red-950/80 text-red-400 border border-red-600 text-xs">
                        ⚠️ Requires Attention
                      </Badge>
                    )}
                  </div>

                  {!userInfo.reports || userInfo.reports.length === 0 ? (
                    <div className="p-4 bg-[#111827] rounded-lg border border-gray-800 text-center text-xs text-gray-400">
                      This user has no received reports.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userInfo.reports.map((report: UserReportItem, index: number) => {
                        const reportId = report.id ?? report.report_id ?? index;
                        return (
                          <div
                            key={reportId}
                            className="p-4 bg-[#111827] rounded-lg border border-gray-700/80 space-y-2 hover:border-gray-600 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-900/40 text-red-300 border border-red-700 text-xs font-semibold">
                                  Cause: {getReasonLabel(report.reason)}
                                </Badge>
                                {getStatusBadge(report.status)}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(report.created_at).toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Report Text / Description */}
                            <div className="p-3 bg-[#1F2937] rounded border border-gray-700 text-sm text-gray-200">
                              <p className="text-xs text-gray-400 mb-1 font-semibold">Report description / text:</p>
                              <p className="whitespace-pre-wrap leading-relaxed">
                                {report.description || 'No description provided by reporter.'}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                              <span>
                                Reporter:{' '}
                                <span className="font-semibold text-white">
                                  {report.reporter_nickname}
                                </span>
                              </span>
                              <span className="text-gray-500">Report ID: #{reportId}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Modal */}
      {userInfo && (
        <SendEmailModal
          user={{
            user_id: userInfo.user_id,
            email: userInfo.email,
            nickname: userInfo.nickname,
          }}
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
        />
      )}
    </>
  );
}
