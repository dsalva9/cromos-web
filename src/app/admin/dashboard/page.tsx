'use client';

import { useAdminStats } from '@/hooks/admin/useAdminStats';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import {
  Users,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';

function AdminDashboardContent() {
  const { stats, loading, error } = useAdminStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">Failed to load dashboard</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">
            Platform overview and statistics
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Users</p>
                  <p className="text-3xl font-black text-white">
                    {stats.total_users}
                  </p>
                </div>
                <Users className="h-12 w-12 text-[#FFC000]" />
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Total Listings */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Listings</p>
                  <p className="text-3xl font-black text-white">
                    {stats.total_listings}
                  </p>
                </div>
                <Package className="h-12 w-12 text-blue-500" />
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Pending Reports */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Pending Reports</p>
                  <p className="text-3xl font-black text-white">
                    {stats.pending_reports}
                  </p>
                </div>
                <AlertTriangle className={`h-12 w-12 ${stats.pending_reports > 0 ? 'text-red-500' : 'text-gray-600'}`} />
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Total Reports */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Reports</p>
                  <p className="text-3xl font-black text-white">
                    {stats.total_reports}
                  </p>
                </div>
                <AlertTriangle className="h-12 w-12 text-orange-500" />
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Public Templates */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center gap-4">
                <FileText className="h-10 w-10 text-purple-500" />
                <div>
                  <p className="text-gray-400 text-sm">Public Templates</p>
                  <p className="text-2xl font-black text-white">
                    {stats.public_templates}
                  </p>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Active Listings */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-10 w-10 text-green-500" />
                <div>
                  <p className="text-gray-400 text-sm">Active Listings</p>
                  <p className="text-2xl font-black text-white">
                    {stats.active_listings}
                  </p>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>

          {/* Total Templates */}
          <ModernCard>
            <ModernCardContent className="p-6">
              <div className="flex items-center gap-4">
                <FileText className="h-10 w-10 text-blue-400" />
                <div>
                  <p className="text-gray-400 text-sm">Total Templates</p>
                  <p className="text-2xl font-black text-white">
                    {stats.total_templates}
                  </p>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        {/* Suspended Users Alert */}
        {stats.suspended_users > 0 && (
          <ModernCard className="mt-6 border-2 border-red-700">
            <ModernCardContent className="p-4 bg-red-900/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <div>
                  <p className="text-red-200 font-bold">
                    {stats.suspended_users} suspended {stats.suspended_users === 1 ? 'user' : 'users'}
                  </p>
                  <p className="text-red-300 text-sm">
                    Review suspended accounts in the Users tab
                  </p>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
