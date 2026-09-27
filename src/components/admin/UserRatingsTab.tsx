'use client';

import { useState } from 'react';
import {
  useAdminRatings,
  RatingFilterType,
  RatingSortType,
  RecentRatingFilterType,
  RatedUser,
} from '@/hooks/admin/useAdminRatings';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Image from 'next/image';
import Link from '@/components/ui/link';
import {
  Star,
  Users,
  Search,
  MessageSquare,
  Mail,
  Shield,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Activity,
  Filter,
  CheckCircle,
  Ban,
  User as UserIcon,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';
import { UserRatingDetailModal } from './UserRatingDetailModal';
import { AdminUserDirectoryModal } from './AdminUserDirectoryModal';
import { SendEmailModal } from './SendEmailModal';
import { useSuspendUser } from '@/hooks/admin/useSuspendUser';
import { toast } from 'sonner';

export default function UserRatingsTab() {
  const supabase = useSupabaseClient();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filter, setFilter] = useState<RatingFilterType>('rated');
  const [sortBy, setSortBy] = useState<RatingSortType>('rating_desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [activeSubView, setActiveSubView] = useState<'users' | 'stream'>('users');

  const {
    stats,
    statsLoading,
    users,
    totalCount,
    usersLoading,
    error,
    recentRatings,
    recentLoading,
    recentFilter,
    setRecentFilter,
    refetchUsers,
    refetchRecent,
    fetchUserDetails,
    deleteRating,
  } = useAdminRatings(debouncedSearch, filter, sortBy, page, pageSize);

  const { suspendUser, unsuspendUser, loading: suspendLoading } = useSuspendUser();

  // Modals state
  const [inspectUser, setInspectUser] = useState<RatedUser | null>(null);
  const [emailUser, setEmailUser] = useState<{ user_id: string; email: string; nickname: string } | null>(null);
  const [selectedDirectoryUserId, setSelectedDirectoryUserId] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleFilterClick = (newFilter: RatingFilterType) => {
    setFilter(newFilter);
    setPage(0);
  };

  const handleSortChange = (newSort: RatingSortType) => {
    setSortBy(newSort);
    setPage(0);
  };

  const handleSuspend = async (userId: string, nickname: string) => {
    const reason = prompt(`Enter reason for suspending ${nickname}:`);
    if (!reason) return;

    try {
      await suspendUser(userId, reason);
      toast.success('User suspended successfully');
      refetchUsers();
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId: string, nickname: string) => {
    if (!confirm(`Unsuspend ${nickname}? This will restore account access.`)) return;

    try {
      await unsuspendUser(userId);
      toast.success('User unsuspended successfully');
      refetchUsers();
    } catch {
      toast.error('Failed to unsuspend user');
    }
  };

  const handleDeleteRecentRating = async (ratingId: number, raterNick: string) => {
    const reason = prompt(`Delete rating from ${raterNick}? Enter reason (optional):`);
    if (reason === null) return;

    try {
      await deleteRating(ratingId, reason || undefined);
      toast.success('Rating deleted successfully');
    } catch {
      toast.error('Failed to delete rating');
    }
  };

  // Helper for star color badge
  const getRatingBadge = (avg: number, count: number) => {
    if (count === 0) {
      return (
        <Badge variant="outline" className="border-gray-600 text-gray-400">
          No ratings
        </Badge>
      );
    }
    if (avg >= 4.5) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-sm">
          ⭐ {avg.toFixed(2)}
        </Badge>
      );
    }
    if (avg >= 3.0) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 font-bold text-sm">
          ⭐ {avg.toFixed(2)}
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-sm animate-pulse">
        ⚠️ ⭐ {avg.toFixed(2)}
      </Badge>
    );
  };

  const renderStars = (score: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= score ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Ratings System Analytics & KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Ratings */}
        <ModernCard className="bg-[#111827] border-2 border-black">
          <ModernCardContent className="p-4">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Total Ratings</span>
              <Star className="h-4 w-4 text-gold" />
            </div>
            <p className="text-2xl font-black text-white">
              {statsLoading ? '...' : stats?.total_ratings.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Platform-wide evaluations
            </p>
          </ModernCardContent>
        </ModernCard>

        {/* Average Platform Rating */}
        <ModernCard className="bg-[#111827] border-2 border-black">
          <ModernCardContent className="p-4">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Platform Average</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-emerald-400">
                {statsLoading ? '...' : (stats?.average_rating ?? 0).toFixed(2)}
              </p>
              <span className="text-sm text-gray-400">/ 5.0</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Overall user sentiment
            </p>
          </ModernCardContent>
        </ModernCard>

        {/* Rated Users */}
        <ModernCard className="bg-[#111827] border-2 border-black">
          <ModernCardContent className="p-4">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Rated Users</span>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {statsLoading ? '...' : stats?.total_rated_users.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Users with at least 1 review
            </p>
          </ModernCardContent>
        </ModernCard>

        {/* Active Raters */}
        <ModernCard className="bg-[#111827] border-2 border-black">
          <ModernCardContent className="p-4">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Active Reviewers</span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-white">
              {statsLoading ? '...' : stats?.total_raters.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Distinct users who have rated
            </p>
          </ModernCardContent>
        </ModernCard>

        {/* Written Feedback Rate */}
        <ModernCard className="bg-[#111827] border-2 border-black col-span-2 md:col-span-1">
          <ModernCardContent className="p-4">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
              <span>Comment Rate</span>
              <MessageSquare className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-white">
                {statsLoading
                  ? '...'
                  : stats?.total_ratings
                  ? `${Math.round(((stats.with_comments ?? 0) / stats.total_ratings) * 100)}%`
                  : '0%'}
              </p>
              <span className="text-xs text-gray-400">
                ({stats?.with_comments ?? 0} reviews)
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Ratings with text comments
            </p>
          </ModernCardContent>
        </ModernCard>
      </div>

      {/* ── 2. Breakdown Cards: Distribution & Sentiment Health ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Star Distribution */}
        <ModernCard className="bg-[#111827] border-2 border-black">
          <ModernCardContent className="p-5 space-y-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Star className="h-4 w-4 text-gold" />
              Rating Score Breakdown
            </h3>

            {statsLoading ? (
              <div className="py-6 flex justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-gold border-r-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {[
                  { star: 5, count: stats?.stars_5 ?? 0, color: 'bg-emerald-500' },
                  { star: 4, count: stats?.stars_4 ?? 0, color: 'bg-lime-500' },
                  { star: 3, count: stats?.stars_3 ?? 0, color: 'bg-amber-500' },
                  { star: 2, count: stats?.stars_2 ?? 0, color: 'bg-orange-500' },
                  { star: 1, count: stats?.stars_1 ?? 0, color: 'bg-red-500' },
                ].map(({ star, count, color }) => {
                  const pct = stats?.total_ratings
                    ? Math.round((count / stats.total_ratings) * 100)
                    : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-10 font-bold text-white flex items-center gap-1">
                        {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-gray-300 font-mono">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ModernCardContent>
        </ModernCard>

        {/* Reputation Health / Category Tiers */}
        <ModernCard className="bg-[#111827] border-2 border-black">
          <ModernCardContent className="p-5 space-y-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold" />
              Reputation Tiers & Warnings
            </h3>

            {statsLoading ? (
              <div className="py-6 flex justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-gold border-r-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Well rated */}
                <button
                  onClick={() => handleFilterClick('well_rated')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    filter === 'well_rated'
                      ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/40'
                      : 'bg-[#1F2937] border-gray-700 hover:border-emerald-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Well Rated</span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ≥ 4.5 ⭐
                    </Badge>
                  </div>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    {stats?.well_rated_users_count ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">High reputation users</p>
                </button>

                {/* Neutral */}
                <button
                  onClick={() => handleFilterClick('neutral')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    filter === 'neutral'
                      ? 'bg-yellow-950/60 border-yellow-500 ring-2 ring-yellow-500/40'
                      : 'bg-[#1F2937] border-gray-700 hover:border-yellow-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Neutral / Mixed</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                      3.0 - 4.4 ⭐
                    </Badge>
                  </div>
                  <p className="text-2xl font-black text-yellow-400 mt-1">
                    {stats?.neutral_rated_users_count ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Moderate reputation</p>
                </button>

                {/* Badly Rated */}
                <button
                  onClick={() => handleFilterClick('badly_rated')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    filter === 'badly_rated'
                      ? 'bg-red-950/60 border-red-500 ring-2 ring-red-500/40'
                      : 'bg-[#1F2937] border-gray-700 hover:border-red-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Badly Rated</span>
                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                      &lt; 3.0 ⭐
                    </Badge>
                  </div>
                  <p className="text-2xl font-black text-red-400 mt-1">
                    {stats?.badly_rated_users_count ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Poor ratings / issues</p>
                </button>

                {/* Flagged / At Risk */}
                <button
                  onClick={() => handleFilterClick('flagged')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    filter === 'flagged'
                      ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/40'
                      : 'bg-[#1F2937] border-gray-700 hover:border-amber-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 font-medium">Flagged / Risk</span>
                    <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Alert 🛡️
                    </Badge>
                  </div>
                  <p className="text-2xl font-black text-amber-400 mt-1">
                    {stats?.flagged_users_count ?? 0}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Suspicious device / low</p>
                </button>
              </div>
            )}
          </ModernCardContent>
        </ModernCard>
      </div>

      {/* ── 3. Sub-View Switcher ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-700 pb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setActiveSubView('users')}
            className={
              activeSubView === 'users'
                ? 'bg-gold text-black font-bold'
                : 'bg-[#374151] text-gray-300 hover:bg-[#4B5563]'
            }
          >
            <Users className="h-4 w-4 mr-2" />
            Users by Rating ({totalCount})
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setActiveSubView('stream');
              if (recentRatings.length === 0) refetchRecent();
            }}
            className={
              activeSubView === 'stream'
                ? 'bg-gold text-black font-bold'
                : 'bg-[#374151] text-gray-300 hover:bg-[#4B5563]'
            }
          >
            <Activity className="h-4 w-4 mr-2" />
            Live Ratings Feed
          </Button>
        </div>

        <div className="text-xs text-gray-400">
          {activeSubView === 'users' ? (
            <span>Showing {users.length} of {totalCount} matching users</span>
          ) : (
            <span>Latest 50 platform ratings</span>
          )}
        </div>
      </div>

      {/* ── 4. Main View Content ──────────────────────────────────────────────────── */}
      {activeSubView === 'users' ? (
        <div className="space-y-4">
          {/* Controls Card */}
          <ModernCard className="bg-[#111827] border-2 border-black">
            <ModernCardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Search */}
                <div className="md:col-span-5 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setPage(0);
                    }}
                    placeholder="Search by nickname or email..."
                    className="pl-9 bg-[#1F2937] border-gray-700 text-white placeholder:text-gray-500 text-sm"
                  />
                </div>

                {/* Filter Selector */}
                <div className="md:col-span-4">
                  <Select
                    value={filter}
                    onValueChange={(v: RatingFilterType) => handleFilterClick(v)}
                  >
                    <SelectTrigger className="bg-[#1F2937] border-gray-700 text-white text-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2937] border-gray-700 text-white">
                      <SelectItem value="rated">⭐ All Rated Users</SelectItem>
                      <SelectItem value="well_rated">🟢 Well Rated (≥ 4.5)</SelectItem>
                      <SelectItem value="neutral">🟡 Neutral (3.0 - 4.4)</SelectItem>
                      <SelectItem value="badly_rated">🔴 Badly Rated (&lt; 3.0)</SelectItem>
                      <SelectItem value="top_reviewed">🔥 Top Reviewed (2+ ratings)</SelectItem>
                      <SelectItem value="flagged">⚠️ Flagged or At-Risk</SelectItem>
                      <SelectItem value="unrated">⚪ Unrated Users (0 ratings)</SelectItem>
                      <SelectItem value="all">🌐 All Users (Directory)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Selector */}
                <div className="md:col-span-3">
                  <Select
                    value={sortBy}
                    onValueChange={(v: RatingSortType) => handleSortChange(v)}
                  >
                    <SelectTrigger className="bg-[#1F2937] border-gray-700 text-white text-sm">
                      <SelectValue placeholder="Sort order" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2937] border-gray-700 text-white">
                      <SelectItem value="rating_desc">⭐ Highest Rating First</SelectItem>
                      <SelectItem value="rating_asc">⚠️ Lowest Rating First</SelectItem>
                      <SelectItem value="count_desc">📈 Most Ratings Received</SelectItem>
                      <SelectItem value="count_asc">📉 Fewest Ratings</SelectItem>
                      <SelectItem value="recent_desc">🕒 Most Recently Rated</SelectItem>
                      <SelectItem value="given_desc">💬 Most Ratings Given</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-gray-400 font-semibold mr-1 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Quick filters:
                </span>
                {[
                  { id: 'rated', label: 'All Rated' },
                  { id: 'well_rated', label: 'Well Rated (≥4.5)', color: 'text-emerald-400 border-emerald-500/40' },
                  { id: 'badly_rated', label: 'Badly Rated (<3.0)', color: 'text-red-400 border-red-500/40 font-bold' },
                  { id: 'top_reviewed', label: 'Most Reviewed', color: 'text-yellow-400 border-yellow-500/40' },
                  { id: 'flagged', label: 'Flagged / Risk', color: 'text-amber-400 border-amber-500/40' },
                  { id: 'unrated', label: 'Unrated (0)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleFilterClick(item.id as RatingFilterType)}
                    className={`px-2.5 py-1 rounded-full border transition-all ${
                      filter === item.id
                        ? 'bg-gold text-black font-bold border-gold'
                        : `bg-[#1F2937] text-gray-300 hover:bg-[#374151] ${item.color || 'border-gray-700'}`
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-200 text-sm">
              Error loading rated users: {error}
            </div>
          )}

          {/* Loading */}
          {usersLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
            </div>
          )}

          {/* Empty state */}
          {!usersLoading && users.length === 0 && (
            <div className="text-center py-16 bg-[#111827] rounded-xl border border-gray-800">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-600" />
              <p className="text-lg font-bold text-white">No users match this criteria</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search query, filter, or sorting option.
              </p>
              {filter !== 'rated' && (
                <Button
                  size="sm"
                  onClick={() => handleFilterClick('rated')}
                  className="mt-4 bg-gold text-black font-semibold"
                >
                  Reset to All Rated Users
                </Button>
              )}
            </div>
          )}

          {/* Users List */}
          {!usersLoading && users.length > 0 && (
            <div className="space-y-3">
              {users.map((u) => {
                const avatar = resolveAvatarUrl(u.avatar_url, supabase);
                const isBadlyRated = u.rating_avg < 3.0 && u.rating_count > 0;

                return (
                  <ModernCard
                    key={u.user_id}
                    className={`border-2 transition-all ${
                      isBadlyRated
                        ? 'border-red-600/70 bg-gradient-to-r from-red-950/30 to-[#111827]'
                        : u.is_flagged
                        ? 'border-amber-600/70 bg-gradient-to-r from-amber-950/30 to-[#111827]'
                        : 'border-black bg-[#111827] hover:border-gray-600'
                    }`}
                  >
                    <ModernCardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {/* User Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedDirectoryUserId(u.user_id)}
                            className="focus:outline-none cursor-pointer flex-shrink-0"
                            title="Click to view full user profile, reports & actions"
                          >
                            {avatar ? (
                              <Image
                                src={avatar}
                                alt={u.nickname}
                                width={52}
                                height={52}
                                className={`rounded-full border-2 object-cover ${
                                  isBadlyRated
                                    ? 'border-red-500'
                                    : 'border-black'
                                }`}
                              />
                            ) : (
                              <div className="w-[52px] h-[52px] rounded-full bg-gold border-2 border-black flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-black" />
                              </div>
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedDirectoryUserId(u.user_id)}
                                className="font-bold text-white text-base hover:text-gold transition-colors truncate text-left cursor-pointer"
                                title="Click to open user directory modal"
                              >
                                {u.nickname}
                              </button>
                              {u.is_admin && (
                                <Badge className="bg-red-600 text-white text-[10px]">Admin</Badge>
                              )}
                              {u.is_patron && (
                                <Badge className="bg-amber-500 text-white text-[10px]">☕ Patron</Badge>
                              )}
                              {u.is_flagged && (
                                <Badge className="bg-amber-600 text-white text-[10px] animate-pulse">
                                  ⚠️ Flagged
                                </Badge>
                              )}
                              {u.is_suspended && (
                                <Badge className="bg-gray-600 text-white text-[10px]">Suspended</Badge>
                              )}
                              {u.reports_received_count > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedDirectoryUserId(u.user_id)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-400 border border-red-600 hover:bg-red-900/80 transition-colors cursor-pointer"
                                  title="Click to view reports, text & cause"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  {u.reports_received_count} {u.reports_received_count === 1 ? 'Report' : 'Reports'}
                                </button>
                              )}
                              {u.country_code && (
                                <span className="text-xs text-gray-400 font-mono uppercase bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                                  {u.country_code}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                            {u.flagged_reason && (
                              <p className="text-[11px] text-amber-300/90 mt-0.5">
                                Reason: {u.flagged_reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rating Metrics */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-gray-800 pt-3 sm:pt-0">
                          {/* Score Badge */}
                          <div className="text-center sm:text-right">
                            <div className="flex items-center gap-1.5 justify-center sm:justify-end">
                              {getRatingBadge(u.rating_avg, u.rating_count)}
                            </div>
                            <div className="flex justify-center sm:justify-end mt-1">
                              {renderStars(Math.round(u.rating_avg))}
                            </div>
                          </div>

                          {/* Counts */}
                          <div className="text-center sm:text-right text-xs space-y-0.5">
                            <div>
                              <span className="text-gray-400">Received: </span>
                              <span className="text-white font-bold">{u.rating_count}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Given: </span>
                              <span className="text-white font-bold">{u.ratings_given_count}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Reports: </span>
                              <button
                                type="button"
                                onClick={() => setSelectedDirectoryUserId(u.user_id)}
                                className={`font-bold hover:underline cursor-pointer ${
                                  u.reports_received_count > 0 ? 'text-red-400' : 'text-white'
                                }`}
                                title="Click to view reports, text & cause"
                              >
                                {u.reports_received_count}
                              </button>
                            </div>
                            {u.latest_rating_at && (
                              <div className="text-[10px] text-gray-500">
                                Last: {new Date(u.latest_rating_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => setInspectUser(u)}
                              className="bg-gold hover:bg-yellow-400 text-black font-semibold text-xs h-8"
                            >
                              <Star className="mr-1 h-3.5 w-3.5 fill-black" />
                              Inspect Reviews ({u.rating_count})
                            </Button>

                            <Link href={`/users/${u.user_id}`} target="_blank">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-700 text-gray-300 hover:bg-[#374151] h-8 px-2.5"
                                title="Open public profile"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEmailUser({
                                  user_id: u.user_id,
                                  email: u.email,
                                  nickname: u.nickname,
                                })
                              }
                              className="border-gray-700 text-gray-300 hover:bg-[#374151] h-8 px-2.5"
                              title="Send email"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>

                            {!u.is_admin && (
                              <>
                                {u.is_suspended ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUnsuspend(u.user_id, u.nickname)}
                                    disabled={suspendLoading}
                                    className="bg-green-700 hover:bg-green-600 text-white h-8 text-xs"
                                  >
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Unsuspend
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSuspend(u.user_id, u.nickname)}
                                    disabled={suspendLoading}
                                    className={
                                      isBadlyRated
                                        ? 'bg-red-700 hover:bg-red-600 text-white h-8 text-xs font-bold'
                                        : 'bg-red-900/60 hover:bg-red-700 text-red-200 border border-red-700 h-8 text-xs'
                                    }
                                  >
                                    <Ban className="mr-1 h-3 w-3" />
                                    Suspend
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </ModernCardContent>
                  </ModernCard>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-gray-400">
              <div>
                Page {page + 1} of {totalPages} ({totalCount} total users)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || usersLoading}
                  className="border-gray-700 text-white hover:bg-[#374151]"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || usersLoading}
                  className="border-gray-700 text-white hover:bg-[#374151]"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Live Ratings Stream ─────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#111827] p-3 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold mr-2">Filter Feed:</span>
              {[
                { id: 'all', label: 'All Ratings' },
                { id: 'with_comments', label: '💬 With Comments' },
                { id: 'bad', label: '⚠️ Bad (1-2 ⭐)' },
                { id: 'good', label: '⭐ Good (4-5 ⭐)' },
              ].map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  onClick={() => setRecentFilter(item.id as RecentRatingFilterType)}
                  className={`text-xs h-7 px-3 ${
                    recentFilter === item.id
                      ? 'bg-gold text-black font-bold'
                      : 'bg-[#1F2937] text-gray-300 hover:bg-[#374151]'
                  }`}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchRecent()}
              disabled={recentLoading}
              className="text-xs border-gray-700 text-gray-300 hover:bg-[#374151] h-7"
            >
              Refresh Feed
            </Button>
          </div>

          {recentLoading && (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
            </div>
          )}

          {!recentLoading && recentRatings.length === 0 && (
            <div className="text-center py-16 bg-[#111827] rounded-xl border border-gray-800 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-600" />
              <p>No recent ratings found for this filter.</p>
            </div>
          )}

          {!recentLoading && recentRatings.length > 0 && (
            <div className="space-y-3">
              {recentRatings.map((r) => {
                const raterAvatar = resolveAvatarUrl(r.rater_avatar_url, supabase);
                const ratedAvatar = resolveAvatarUrl(r.rated_avatar_url, supabase);
                const isBad = r.rating <= 2;

                return (
                  <div
                    key={r.rating_id}
                    className={`p-4 rounded-lg border transition-all ${
                      isBad
                        ? 'bg-red-950/20 border-red-800/60'
                        : 'bg-[#111827] border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                      {/* Flow: Rater -> Rated */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Rater */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDirectoryUserId(r.rater_id)}
                            className="flex items-center gap-1.5 font-bold text-white hover:text-gold text-sm cursor-pointer"
                            title="Open user directory modal"
                          >
                            {raterAvatar ? (
                              <Image src={raterAvatar} alt={r.rater_nickname} width={24} height={24} className="rounded-full border border-black" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center text-[10px] text-black font-bold">
                                {r.rater_nickname.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <span>{r.rater_nickname}</span>
                          </button>
                          <span className="text-xs text-gray-400">rated</span>
                        </div>

                        {/* Rated User */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDirectoryUserId(r.rated_id)}
                            className="flex items-center gap-1.5 font-bold text-white hover:text-gold text-sm cursor-pointer"
                            title="Open user directory modal"
                          >
                            {ratedAvatar ? (
                              <Image src={ratedAvatar} alt={r.rated_nickname} width={24} height={24} className="rounded-full border border-black" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center text-[10px] text-black font-bold">
                                {r.rated_nickname.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <span>{r.rated_nickname}</span>
                          </button>
                        </div>
                      </div>

                      {/* Stars & delete */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          {renderStars(r.rating)}
                          <span className="font-bold text-white text-sm">{r.rating}/5</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRecentRating(r.rating_id, r.rater_nickname)}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Delete abusive rating"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Comment */}
                    {r.comment ? (
                      <div className="p-3 bg-[#1F2937] rounded border border-gray-700/80 text-sm text-gray-200 mt-2">
                        <p className="italic">&ldquo;{r.comment}&rdquo;</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic mt-1">No written comment</p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-800">
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      {r.context_type && (
                        <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-400 uppercase">
                          {r.context_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {/* Inspect User Rating Details Modal */}
      <UserRatingDetailModal
        user={inspectUser}
        open={!!inspectUser}
        onClose={() => setInspectUser(null)}
        fetchUserDetails={fetchUserDetails}
        onDeleteRating={deleteRating}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        user={emailUser}
        open={!!emailUser}
        onClose={() => setEmailUser(null)}
      />

      {/* Admin User Directory & Moderation Modal */}
      <AdminUserDirectoryModal
        userId={selectedDirectoryUserId}
        open={!!selectedDirectoryUserId}
        onClose={() => setSelectedDirectoryUserId(null)}
        onUserUpdated={() => refetchUsers()}
      />
    </div>
  );
}
