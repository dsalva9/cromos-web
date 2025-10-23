'use client';

import { useState } from 'react';
import { usePendingReports } from '@/hooks/admin/usePendingReports';
import { ReportDetailModal } from '@/components/admin/ReportDetailModal';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Eye } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';

function ReportsQueueContent() {
  const { reports, loading, error, refetch } = usePendingReports();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'user': return 'bg-red-500';
      case 'listing': return 'bg-blue-500';
      case 'template': return 'bg-purple-500';
      case 'chat': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F2937] flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-[#FFC000] border-r-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Reports Queue
          </h1>
          <p className="text-gray-400">
            Review and moderate reported content
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            Error loading reports: {error}
          </div>
        )}

        {/* Empty State */}
        {!error && reports.length === 0 && (
          <div className="text-center py-16">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400 text-lg">
              No pending reports
            </p>
            <p className="text-gray-500 text-sm mt-2">
              All caught up!
            </p>
          </div>
        )}

        {/* Reports List */}
        <div className="space-y-4">
          {reports.map((report) => (
            <ModernCard key={report.report_id}>
              <ModernCardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${getEntityTypeColor(report.entity_type)} text-white uppercase text-xs`}>
                            {report.entity_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {report.reason}
                          </Badge>
                        </div>
                        <p className="text-white font-bold">
                          Reported by {report.reporter_nickname}
                        </p>
                      </div>

                      <p className="text-sm text-gray-400 flex-shrink-0">
                        {formatDate(report.created_at)}
                      </p>
                    </div>

                    {/* Description */}
                    {report.description && (
                      <p className="text-gray-300 text-sm">
                        {report.description}
                      </p>
                    )}

                    {/* Entity ID */}
                    <p className="text-xs text-gray-500">
                      Entity ID: {report.entity_id}
                    </p>

                    {/* Action */}
                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedReportId(report.report_id)}
                        className="bg-[#FFC000] text-black hover:bg-[#FFD700]"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Review Report
                      </Button>
                    </div>
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          ))}
        </div>

        {/* Report Detail Modal */}
        {selectedReportId && (
          <ReportDetailModal
            reportId={selectedReportId}
            onClose={() => setSelectedReportId(null)}
            onResolved={refetch}
          />
        )}
      </div>
    </div>
  );
}

export default function ReportsQueuePage() {
  return (
    <AdminGuard>
      <ReportsQueueContent />
    </AdminGuard>
  );
}
