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
import Link from 'next/link';
import { User, Search, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSuspendUser } from '@/hooks/admin/useSuspendUser';
import { toast } from 'sonner';
import AdminGuard from '@/components/AdminGuard';
import { useDebounce } from '@/hooks/useDebounce';

function UserSearchContent() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const debouncedQuery = useDebounce(query, 500);

  const { users, loading, error, refetch } = useUserSearch(debouncedQuery, status);
  const { suspendUser, unsuspendUser, loading: actionLoading } = useSuspendUser();

  const handleSuspend = async (userId: string, nickname: string) => {
    const reason = prompt(`Enter reason for suspending ${nickname}:`);
    if (!reason) return;

    try {
      await suspendUser(userId, reason);
      toast.success('User suspended successfully');
      refetch();
    } catch {
      toast.error('Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId: string, nickname: string) => {
    const reason = prompt(`Enter reason for unsuspending ${nickname}:`);
    if (!reason) return;

    try {
      await unsuspendUser(userId, reason);
      toast.success('User unsuspended successfully');
      refetch();
    } catch {
      toast.error('Failed to unsuspend user');
    }
  };

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            User Management
          </h1>
          <p className="text-gray-400">
            Search and moderate users
          </p>
        </div>

        {/* Search and Filters */}
        <ModernCard className="mb-6">
          <ModernCardContent className="p-6 space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label className="text-white">Search</Label>
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
              <Label className="text-white">Status</Label>
              <Select value={status} onValueChange={(v: 'all' | 'active' | 'suspended') => setStatus(v)}>
                <SelectTrigger className="bg-[#374151] border-2 border-black text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="suspended">Suspended Only</SelectItem>
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
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.nickname}
                        width={64}
                        height={64}
                        className="rounded-full border-2 border-black"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#FFC000] border-2 border-black flex items-center justify-center">
                        <User className="h-8 w-8 text-black" />
                      </div>
                    )}
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
                          {user.is_suspended && (
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

                      {!user.is_admin && (
                        <>
                          {user.is_suspended ? (
                            <Button
                              size="sm"
                              onClick={() => handleUnsuspend(user.user_id, user.nickname)}
                              disabled={actionLoading}
                              className="bg-green-700 hover:bg-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Unsuspend
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSuspend(user.user_id, user.nickname)}
                              disabled={actionLoading}
                              className="bg-red-700 hover:bg-red-600"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Warning if reports > 0 */}
                    {user.reports_received_count > 0 && (
                      <div className="flex items-center gap-2 text-sm text-orange-400 pt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>This user has received {user.reports_received_count} report(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <UserSearchContent />
    </AdminGuard>
  );
}
