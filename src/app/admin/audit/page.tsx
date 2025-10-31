'use client';

import { useState } from 'react';
import { useAuditLog } from '@/hooks/admin/useAuditLog';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, Ban, CheckCircle, X, Trash } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';

function AuditLogContent() {
  const [actionType, setActionType] = useState('all');
  const { logs, loading, error, hasMore, loadMore } = useAuditLog(actionType);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'suspend_user': return <Ban className="h-5 w-5 text-red-500" />;
      case 'unsuspend_user': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'remove_content': return <Trash className="h-5 w-5 text-orange-500" />;
      case 'resolve_report': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'suspend_user': return 'bg-red-500';
      case 'unsuspend_user': return 'bg-green-500';
      case 'remove_content': return 'bg-orange-500';
      case 'resolve_report': return 'bg-blue-500';
      default: return 'bg-blue-500';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Audit Log
          </h1>
          <p className="text-gray-400">
            Complete history of admin actions
          </p>
        </div>

        {/* Filters */}
        <ModernCard className="mb-6">
          <ModernCardContent className="p-6">
            <div className="space-y-2">
              <Label className="text-white">Filter by Action Type</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="bg-[#374151] border-2 border-black text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="suspend_user">Suspend User</SelectItem>
                  <SelectItem value="unsuspend_user">Unsuspend User</SelectItem>
                  <SelectItem value="remove_content">Remove Content</SelectItem>
                  <SelectItem value="resolve_report">Resolve Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ModernCardContent>
        </ModernCard>

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            Error loading audit log: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && logs.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#FFC000] border-r-transparent rounded-full" />
          </div>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg">
              No audit logs found
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          {logs.map((log) => (
            <ModernCard key={log.id}>
              <ModernCardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(log.action_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge className={`${getActionColor(log.action_type)} text-white uppercase text-xs mb-2`}>
                          {log.action_type ? log.action_type.replace(/_/g, ' ') : 'Unknown'}
                        </Badge>
                        <p className="text-white font-bold">
                          By {log.admin_nickname || 'System'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-400 flex-shrink-0">
                        {formatDate(log.created_at)}
                      </p>
                    </div>

                    {/* Target */}
                    <div className="text-sm space-y-1">
                      <p className="text-gray-400">
                        <span className="font-bold">Target:</span>{' '}
                        {log.target_type} (ID: {log.target_id})
                      </p>

                      {/* Reason */}
                      {log.reason && (
                        <div className="bg-[#374151] p-3 rounded-md mt-2">
                          <p className="text-gray-300 text-sm">
                            <span className="font-bold">Reason:</span> {log.reason}
                          </p>
                        </div>
                      )}

                      {/* Metadata */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-gray-400 cursor-pointer hover:text-white">
                            View metadata
                          </summary>
                          <pre className="bg-[#374151] p-3 rounded-md mt-2 text-xs text-gray-300 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-8">
            <Button onClick={loadMore} variant="outline">
              Load More
            </Button>
          </div>
        )}

        {/* Loading More */}
        {loading && logs.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin h-6 w-6 border-4 border-[#FFC000] border-r-transparent rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <AdminGuard>
      <AuditLogContent />
    </AdminGuard>
  );
}
