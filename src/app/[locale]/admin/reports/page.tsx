'use client';

import { useState, useMemo } from 'react';
import { usePendingReports } from '@/hooks/admin/usePendingReports';
import { useAllReports } from '@/hooks/admin/useAllReports';
import { ReportDetailModal } from '@/components/admin/ReportDetailModal';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  Eye,
  ChevronDown,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString();
}

function getEntityTypeColor(type: string) {
  switch (type) {
    case 'user': return 'bg-red-500';
    case 'listing': return 'bg-blue-500';
    case 'template': return 'bg-purple-500';
    case 'chat': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          <Clock className="mr-1 h-3 w-3" />
          Pendiente
        </Badge>
      );
    case 'resolved':
      return (
        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
          <CheckCircle className="mr-1 h-3 w-3" />
          Resuelto
        </Badge>
      );
    case 'dismissed':
      return (
        <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/30">
          <XCircle className="mr-1 h-3 w-3" />
          Descartado
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Pending Tab ────────────────────────────────────────────────────────────

function PendingTab({
  onSelectReport,
}: {
  onSelectReport: (id: string) => void;
}) {
  const { reports, loading, error, refetch } = usePendingReports();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        Error al cargar reportes: {error}
        <Button onClick={refetch} variant="outline" size="sm" className="ml-4">
          Reintentar
        </Button>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400 text-lg">No hay reportes pendientes</p>
        <p className="text-gray-500 text-sm mt-2">¡Todo al día!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <ModernCard key={report.report_id}>
          <ModernCardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div className="flex-1 space-y-2">
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
                    <p className="text-white font-bold text-lg mb-1">
                      {report.entity_title || 'Unknown'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Reportado por {report.reporter_nickname}
                    </p>
                  </div>
                  <p className="text-sm text-gray-400 flex-shrink-0">
                    {formatDate(report.created_at)}
                  </p>
                </div>

                {report.description && (
                  <p className="text-gray-300 text-sm">{report.description}</p>
                )}

                <p className="text-xs text-gray-500">
                  Entity ID: {report.entity_id}
                </p>

                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={() => onSelectReport(String(report.report_id))}
                    className="bg-gold text-black hover:bg-gold-light"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Revisar Reporte
                  </Button>
                </div>
              </div>
            </div>
          </ModernCardContent>
        </ModernCard>
      ))}
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────────

function HistoryTab({
  onSelectReport,
}: {
  onSelectReport: (id: string, readOnly: boolean) => void;
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'target' | 'reporter'>('target');

  const { reports, loading, error, loadMore, hasMore, refetch } = useAllReports({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // Client-side nickname filter
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter((r) => {
      if (searchMode === 'reporter') {
        return r.reporter_nickname?.toLowerCase().includes(q);
      }
      // target: search in entity_title (which is the target user's nickname for user reports)
      return r.entity_title?.toLowerCase().includes(q) || r.reporter_nickname?.toLowerCase().includes(q);
    });
  }, [reports, searchQuery, searchMode]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px] bg-[#374151] border-gray-600 text-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#374151] border-gray-600">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="resolved">Resueltos</SelectItem>
              <SelectItem value="dismissed">Descartados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nickname..."
              className="pl-10 bg-[#374151] border-gray-600 text-white placeholder:text-gray-500"
            />
          </div>
          <Select
            value={searchMode}
            onValueChange={(v) => setSearchMode(v as 'target' | 'reporter')}
          >
            <SelectTrigger className="w-[160px] bg-[#374151] border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#374151] border-gray-600">
              <SelectItem value="target">Sobre usuario</SelectItem>
              <SelectItem value="reporter">Por usuario</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {loading && reports.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-12 w-12 border-4 border-gold border-r-transparent rounded-full" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-red-500 text-center py-8">
          Error al cargar reportes: {error}
          <Button onClick={refetch} variant="outline" size="sm" className="ml-4">
            Reintentar
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredReports.length === 0 && (
        <div className="text-center py-16">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg">No se encontraron reportes</p>
          <p className="text-gray-500 text-sm mt-2">
            Intenta ajustar los filtros
          </p>
        </div>
      )}

      {/* Reports list */}
      <div className="space-y-4">
        {filteredReports.map((report) => {
          const isResolved = report.status === 'resolved' || report.status === 'dismissed';
          return (
            <ModernCard key={report.report_id}>
              <ModernCardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <AlertTriangle
                      className={`h-8 w-8 ${
                        report.status === 'pending'
                          ? 'text-red-500'
                          : report.status === 'resolved'
                            ? 'text-green-500'
                            : 'text-gray-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`${getEntityTypeColor(report.entity_type)} text-white uppercase text-xs`}>
                            {report.entity_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {report.reason}
                          </Badge>
                          {getStatusBadge(report.status)}
                        </div>
                        <p className="text-white font-bold text-lg mb-1">
                          {report.entity_title || 'Unknown'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Reportado por{' '}
                          <span className="text-white font-medium">
                            {report.reporter_nickname}
                          </span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-gray-400">
                          {formatDate(report.created_at)}
                        </p>
                        {report.resolved_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Resuelto: {formatDate(report.resolved_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    {report.description && (
                      <p className="text-gray-300 text-sm">{report.description}</p>
                    )}

                    {/* Admin notes for resolved reports */}
                    {isResolved && report.admin_notes && (
                      <div className="bg-[#374151]/60 border border-gray-600/40 rounded-md p-3 mt-2">
                        <p className="text-xs text-gray-400 mb-1">
                          Notas del admin
                          {report.admin_nickname && (
                            <span className="text-gray-500">
                              {' '}— {report.admin_nickname}
                            </span>
                          )}
                        </p>
                        <p className="text-gray-300 text-sm">{report.admin_notes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          onSelectReport(String(report.report_id), isResolved)
                        }
                        className={
                          isResolved
                            ? 'bg-gray-600 text-white hover:bg-gray-500'
                            : 'bg-gold text-black hover:bg-gold-light'
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {isResolved ? 'Ver Detalle' : 'Revisar Reporte'}
                      </Button>
                      <p className="text-xs text-gray-500">
                        ID: {report.report_id}
                      </p>
                    </div>
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && !loading && filteredReports.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={loadMore}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-[#374151]"
          >
            <ChevronDown className="mr-2 h-4 w-4" />
            Cargar más reportes
          </Button>
        </div>
      )}

      {loading && reports.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-gold border-r-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}

// ─── Main Content ───────────────────────────────────────────────────────────

function ReportsQueueContent() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReadOnly, setSelectedReadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Refetch references for each tab
  const { refetch: refetchPending } = usePendingReports();

  const handleSelectReport = (id: string, readOnly = false) => {
    setSelectedReportId(id);
    setSelectedReadOnly(readOnly);
  };

  const handleResolved = () => {
    refetchPending();
  };

  return (
    <div className="min-h-screen bg-[#1F2937]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-white mb-2">
            Reportes
          </h1>
          <p className="text-gray-400">
            Revisa y modera el contenido reportado
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-[#374151] border border-gray-600 mb-6">
            <TabsTrigger
              value="pending"
              className="data-[state=active]:bg-gold data-[state=active]:text-black"
            >
              Pendientes
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-gold data-[state=active]:text-black"
            >
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingTab
              onSelectReport={(id) => handleSelectReport(id, false)}
            />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab onSelectReport={handleSelectReport} />
          </TabsContent>
        </Tabs>

        {/* Report Detail Modal */}
        {selectedReportId && (
          <ReportDetailModal
            reportId={selectedReportId}
            onClose={() => setSelectedReportId(null)}
            onResolved={handleResolved}
            readOnly={selectedReadOnly}
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
