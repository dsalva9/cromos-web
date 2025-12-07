'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import AdminGuard from '@/components/AdminGuard';
import {
  Trash2,
  UserX,
  RotateCcw,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

function RetentionTestContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [userId, setUserId] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [listingId, setListingId] = useState('');
  const [listingReason, setListingReason] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateReason, setTemplateReason] = useState('');
  const [stats, setStats] = useState<any>(null);

  const handleRpc = async (functionName: string, params?: any) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(functionName, params);

      if (rpcError) {
        setError(rpcError.message);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_get_retention_stats');

      if (rpcError) {
        setError(rpcError.message);
      } else {
        setStats(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Retention System Test (Phase 3)
          </h1>
          <p className="text-gray-400">
            Test admin suspension, deletion, and retention functions
          </p>
        </div>

        {/* Results/Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="h-5 w-5" />
              <p className="font-semibold">Error</p>
            </div>
            <p className="text-red-400 mt-2">{error}</p>
          </div>
        )}

        {result && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <CheckCircle className="h-5 w-5" />
              <p className="font-semibold">Success</p>
            </div>
            <pre className="text-green-400 text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* Stats Card */}
        <ModernCard className="mb-6">
          <ModernCardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-[#FFC000]" />
                <h2 className="text-xl font-bold text-white">Retention Statistics</h2>
              </div>
              <Button
                onClick={loadStats}
                disabled={loading}
                className="bg-[#FFC000] hover:bg-[#FFD700] text-black"
              >
                {loading ? 'Loading...' : 'Load Stats'}
              </Button>
            </div>

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#374151] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Pending Deletions</p>
                  <p className="text-2xl font-bold text-white">{stats.pending_deletions}</p>
                </div>
                <div className="bg-[#374151] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Legal Holds</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.legal_holds}</p>
                </div>
                <div className="bg-[#374151] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Suspended Users</p>
                  <p className="text-2xl font-bold text-red-500">{stats.suspended_users}</p>
                </div>
                <div className="bg-[#374151] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Deleted Users</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.deleted_users}</p>
                </div>
                <div className="bg-[#374151] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Deleted Listings</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.deleted_listings}</p>
                </div>
                <div className="bg-[#374151] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Deleted Templates</p>
                  <p className="text-2xl font-bold text-purple-500">{stats.deleted_templates}</p>
                </div>
                <div className="bg-[#374151] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Processed Today</p>
                  <p className="text-2xl font-bold text-green-500">{stats.processed_today}</p>
                </div>
                <div className="bg-[#374151] p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Next Deletion</p>
                  <p className="text-sm font-bold text-white">
                    {stats.next_deletion ? new Date(stats.next_deletion).toLocaleDateString() : 'None'}
                  </p>
                </div>
              </div>
            )}
          </ModernCardContent>
        </ModernCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Suspension */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <UserX className="h-6 w-6 text-red-500" />
                <h2 className="text-xl font-bold text-white">Suspend User</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">User ID (UUID)</Label>
                  <Input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className="bg-[#374151] border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Reason</Label>
                  <Textarea
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="e.g., Violating community guidelines"
                    className="bg-[#374151] border-gray-600 text-white"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRpc('admin_suspend_account', {
                      p_user_id: userId,
                      p_reason: suspendReason
                    })}
                    disabled={loading || !userId || !suspendReason}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Suspend
                  </Button>

                  <Button
                    onClick={() => handleRpc('admin_move_to_deletion', {
                      p_user_id: userId
                    })}
                    disabled={loading || !userId}
                    variant="outline"
                    className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500/10"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Move to Deletion
                  </Button>

                  <Button
                    onClick={() => handleRpc('admin_unsuspend_account', {
                      p_user_id: userId
                    })}
                    disabled={loading || !userId}
                    variant="outline"
                    className="flex-1 border-green-500 text-green-500 hover:bg-green-500/10"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Unsuspend
                  </Button>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Delete Listing */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="h-6 w-6 text-red-500" />
                <h2 className="text-xl font-bold text-white">Delete Listing</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Listing ID</Label>
                  <Input
                    type="number"
                    value={listingId}
                    onChange={(e) => setListingId(e.target.value)}
                    placeholder="123"
                    className="bg-[#374151] border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Reason</Label>
                  <Textarea
                    value={listingReason}
                    onChange={(e) => setListingReason(e.target.value)}
                    placeholder="e.g., Inappropriate content"
                    className="bg-[#374151] border-gray-600 text-white"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => handleRpc('admin_delete_listing', {
                    p_listing_id: parseInt(listingId),
                    p_reason: listingReason
                  })}
                  disabled={loading || !listingId || !listingReason}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Listing (90-day retention)
                </Button>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Delete Template */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="h-6 w-6 text-purple-500" />
                <h2 className="text-xl font-bold text-white">Delete Template</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Template ID</Label>
                  <Input
                    type="number"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    placeholder="456"
                    className="bg-[#374151] border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Reason</Label>
                  <Textarea
                    value={templateReason}
                    onChange={(e) => setTemplateReason(e.target.value)}
                    placeholder="e.g., Policy violation"
                    className="bg-[#374151] border-gray-600 text-white"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => handleRpc('admin_delete_template', {
                    p_template_id: parseInt(templateId),
                    p_reason: templateReason
                  })}
                  disabled={loading || !templateId || !templateReason}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Template (90-day retention)
                </Button>

                <p className="text-xs text-gray-400 italic">
                  Note: User albums (copies) will be preserved
                </p>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Info Card */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                <h2 className="text-xl font-bold text-white">Important Notes</h2>
              </div>

              <div className="space-y-3 text-gray-300 text-sm">
                <div>
                  <p className="font-semibold text-white mb-1">Suspension Flow:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Suspend does NOT auto-schedule deletion</li>
                    <li>Must explicitly "Move to Deletion" for 90-day countdown</li>
                    <li>Unsuspend cancels any scheduled deletion</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-white mb-1">Retention Periods:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Listings: 90 days</li>
                    <li>Templates: 90 days (albums preserved)</li>
                    <li>Users: 90 days</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-white mb-1">Audit Trail:</p>
                  <p className="text-xs">All actions logged in audit_log table</p>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>
      </div>
    </div>
  );
}

export default function RetentionTestPage() {
  return (
    <AdminGuard>
      <RetentionTestContent />
    </AdminGuard>
  );
}
