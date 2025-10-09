'use client';

import { useState } from 'react';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import CollectionsTab from '@/components/admin/CollectionsTab';
import PagesTab from '@/components/admin/PagesTab';
import StickersTab from '@/components/admin/StickersTab';
import BulkUploadTab from '@/components/admin/BulkUploadTab';
import UsersTab from '@/components/admin/UsersTab';
import AuditTab from '@/components/admin/AuditTab';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('collections');

  const tabs = [
    { value: 'collections', label: 'Colecciones' },
    { value: 'pages', label: 'Páginas' },
    { value: 'stickers', label: 'Cromos' },
    { value: 'bulk', label: 'Carga Masiva' },
    { value: 'users', label: 'Usuarios' },
    { value: 'audit', label: 'Auditoría' },
  ];

  return (
    <div className="min-h-screen bg-[#1F2937]">
      {/* Header */}
      <div className="bg-[#2D3748] border-b-4 border-black">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-black text-white mb-2">Panel de Administración</h1>
          <p className="text-gray-300">Gestiona colecciones, páginas, cromos, usuarios y audita acciones</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-[#2D3748] border-b-4 border-black sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <SegmentedTabs tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'collections' && <CollectionsTab />}
        {activeTab === 'pages' && <PagesTab />}
        {activeTab === 'stickers' && <StickersTab />}
        {activeTab === 'bulk' && <BulkUploadTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
