'use client';

import { useAdminSuspendedUsers } from '@/hooks/admin/useAdminSuspendedUsers';
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
import { Loader2, User, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

export function SuspendedUsersTable() {
  const { users, loading, error } = useAdminSuspendedUsers();

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
        <p>Error loading suspended users: {error}</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 text-gray-400">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No suspended users</p>
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
    <div className="rounded-md border border-gray-700">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Suspended At</TableHead>
            <TableHead>Suspended By</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
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
                {formatDate(user.suspended_at)}
              </TableCell>
              <TableCell className="text-sm text-gray-400">
                {user.suspended_by_nickname || 'System'}
              </TableCell>
              <TableCell>
                <span className="text-sm text-orange-400">{user.suspension_reason || 'N/A'}</span>
              </TableCell>
              <TableCell>
                {user.is_pending_deletion ? (
                  <div className="flex flex-col gap-1">
                    <Badge className="bg-red-600 hover:bg-red-700">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending Deletion
                    </Badge>
                    {user.days_until_deletion !== null && (
                      <span
                        className={`text-xs font-semibold ${
                          user.days_until_deletion <= 7
                            ? 'text-red-500'
                            : user.days_until_deletion <= 30
                              ? 'text-orange-500'
                              : 'text-gray-400'
                        }`}
                      >
                        {user.days_until_deletion} days left
                      </span>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-orange-400">
                    Suspended
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Link href={`/users/${user.user_id}`}>
                  <Button size="sm" variant="outline">
                    View Profile
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
