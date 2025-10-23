'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, AlertTriangle, Users, FileText } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname.includes('/admin/reports')) return 'reports';
    if (pathname.includes('/admin/users')) return 'users';
    if (pathname.includes('/admin/audit')) return 'audit';
    return 'dashboard';
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#1F2937]">
        {/* Admin Header */}
        <div className="border-b-2 border-black bg-[#111827]">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-black uppercase text-white">
                  Admin Panel
                </h1>
                <p className="text-gray-400 text-sm">
                  Platform management and moderation
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={getActiveTab()} className="w-full">
              <TabsList className="grid w-full max-w-2xl grid-cols-4 bg-[#1F2937]">
                <Link href="/admin/dashboard">
                  <TabsTrigger
                    value="dashboard"
                    className="w-full data-[state=active]:bg-[#FFC000] data-[state=active]:text-black"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </TabsTrigger>
                </Link>

                <Link href="/admin/reports">
                  <TabsTrigger
                    value="reports"
                    className="w-full data-[state=active]:bg-[#FFC000] data-[state=active]:text-black"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Reports
                  </TabsTrigger>
                </Link>

                <Link href="/admin/users">
                  <TabsTrigger
                    value="users"
                    className="w-full data-[state=active]:bg-[#FFC000] data-[state=active]:text-black"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Users
                  </TabsTrigger>
                </Link>

                <Link href="/admin/audit">
                  <TabsTrigger
                    value="audit"
                    className="w-full data-[state=active]:bg-[#FFC000] data-[state=active]:text-black"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Audit Log
                  </TabsTrigger>
                </Link>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </AdminGuard>
  );
}
