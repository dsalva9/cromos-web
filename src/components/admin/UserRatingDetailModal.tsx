'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from '@/components/ui/link';
import Image from 'next/image';
import {
  Star,
  User,
  Trash2,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { RatedUser, UserRatingDetail } from '@/hooks/admin/useAdminRatings';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';

interface UserRatingDetailModalProps {
  user: RatedUser | null;
  open: boolean;
  onClose: () => void;
  fetchUserDetails: (userId: string, direction: 'received' | 'given') => Promise<UserRatingDetail[]>;
  onDeleteRating: (ratingId: number, reason?: string) => Promise<boolean>;
}

export function UserRatingDetailModal({
  user,
  open,
  onClose,
  fetchUserDetails,
  onDeleteRating,
}: UserRatingDetailModalProps) {
  const supabase = useSupabaseClient();
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');
  const [receivedRatings, setReceivedRatings] = useState<UserRatingDetail[]>([]);
  const [givenRatings, setGivenRatings] = useState<UserRatingDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !user) {
      setReceivedRatings([]);
      setGivenRatings([]);
      return;
    }

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [received, given] = await Promise.all([
          fetchUserDetails(user.user_id, 'received'),
          fetchUserDetails(user.user_id, 'given'),
        ]);
        if (isMounted) {
          setReceivedRatings(received);
          setGivenRatings(given);
        }
      } catch {
        toast.error('Failed to load user rating details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [open, user, fetchUserDetails]);

  if (!user) return null;

  const handleDelete = async (ratingId: number, raterNick: string) => {
    const reason = prompt(`Enter reason for deleting rating from ${raterNick} (optional):`);
    if (reason === null) return; // cancelled

    setDeletingId(ratingId);
    try {
      await onDeleteRating(ratingId, reason || undefined);
      toast.success('Rating deleted successfully and scores updated');
      setReceivedRatings((prev) => prev.filter((r) => r.rating_id !== ratingId));
      setGivenRatings((prev) => prev.filter((r) => r.rating_id !== ratingId));
    } catch {
      toast.error('Failed to delete rating');
    } finally {
      setDeletingId(null);
    }
  };

  const avatarUrl = resolveAvatarUrl(user.avatar_url, supabase);

  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-4 w-4 ${
              s <= score ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 4.5) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (score >= 3.0) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const renderRatingItem = (item: UserRatingDetail, isReceived: boolean) => {
    const otherAvatar = resolveAvatarUrl(item.other_avatar_url, supabase);
    return (
      <div
        key={item.rating_id}
        className="p-4 rounded-lg bg-[#2D3748] border border-gray-700 hover:border-gray-600 transition-colors space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={`/users/${item.other_user_id}`}>
              {otherAvatar ? (
                <Image
                  src={otherAvatar}
                  alt={item.other_nickname}
                  width={40}
                  height={40}
                  className="rounded-full border border-black object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gold border border-black flex items-center justify-center">
                  <User className="h-5 w-5 text-black" />
                </div>
              )}
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/users/${item.other_user_id}`}
                  className="font-bold text-white hover:text-gold transition-colors flex items-center gap-1"
                >
                  <span>{item.other_nickname}</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
                <span className="text-xs text-gray-400">
                  {isReceived ? '(Rater)' : '(Rated User)'}
                </span>
              </div>
              <p className="text-xs text-gray-400">{item.other_email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {renderStars(item.rating)}
              <span className="font-bold text-white text-sm">
                {item.rating}/5
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDelete(item.rating_id, item.other_nickname)}
              disabled={deletingId === item.rating_id}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
              title="Delete this rating"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Comment block */}
        {item.comment ? (
          <div className="p-3 bg-[#1F2937] rounded-md border border-gray-700/80 text-sm text-gray-200 flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="italic">&ldquo;{item.comment}&rdquo;</p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic pl-6">No written comment provided</p>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-700/50">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>{new Date(item.created_at).toLocaleString()}</span>
            {item.updated_at && item.updated_at !== item.created_at && (
              <span className="text-gray-500">(updated {new Date(item.updated_at).toLocaleDateString()})</span>
            )}
          </div>
          {item.context_type && (
            <Badge variant="outline" className="text-[10px] text-gray-300 border-gray-600 uppercase">
              {item.context_type}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-[#1F2937] border-2 border-black text-white p-0">
        <DialogHeader className="p-6 pb-4 border-b border-gray-700">
          <DialogTitle className="flex items-center justify-between text-xl font-black text-white">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={user.nickname}
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-black"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gold border-2 border-black flex items-center justify-center">
                  <User className="h-6 w-6 text-black" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span>{user.nickname}</span>
                  <Link href={`/users/${user.user_id}`} target="_blank">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gold hover:text-yellow-400">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                  {user.is_admin && <Badge className="bg-red-600 text-white text-xs">Admin</Badge>}
                  {user.is_patron && <Badge className="bg-amber-500 text-white text-xs">☕ Patron</Badge>}
                  {user.is_flagged && <Badge className="bg-amber-600 text-white text-xs">⚠️ Flagged</Badge>}
                  {user.is_suspended && <Badge className="bg-gray-600 text-white text-xs">Suspended</Badge>}
                </div>
                <p className="text-xs text-gray-400 font-normal">{user.email}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Badge className={`text-sm font-bold border ${getScoreBadgeColor(user.rating_avg)}`}>
                  ⭐ {user.rating_avg.toFixed(2)} / 5.0
                </Badge>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {user.rating_count} received • {user.ratings_given_count} given
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'received' | 'given')}>
            <TabsList className="bg-[#374151] border border-gray-600 mb-4 w-full grid grid-cols-2">
              <TabsTrigger
                value="received"
                className="data-[state=active]:bg-gold data-[state=active]:text-black flex items-center justify-center gap-2"
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>Received Ratings ({receivedRatings.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="given"
                className="data-[state=active]:bg-gold data-[state=active]:text-black flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>Given to Others ({givenRatings.length})</span>
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
              </div>
            ) : (
              <>
                <TabsContent value="received" className="space-y-3 mt-0">
                  {receivedRatings.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                      <p>This user has not received any ratings yet.</p>
                    </div>
                  ) : (
                    receivedRatings.map((r) => renderRatingItem(r, true))
                  )}
                </TabsContent>

                <TabsContent value="given" className="space-y-3 mt-0">
                  {givenRatings.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                      <p>This user has not submitted any ratings to others yet.</p>
                    </div>
                  ) : (
                    givenRatings.map((r) => renderRatingItem(r, false))
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
