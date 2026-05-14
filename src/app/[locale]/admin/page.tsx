'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import CollectionsTab from '@/components/admin/CollectionsTab';
import TeamsTab from '@/components/admin/TeamsTab';
import PagesTab from '@/components/admin/PagesTab';
import StickersTab from '@/components/admin/StickersTab';
import BulkUploadTab from '@/components/admin/BulkUploadTab';
import UsersTab from '@/components/admin/UsersTab';
import AuditTab from '@/components/admin/AuditTab';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('collections');
  const t = useTranslations('admin.index');

  const tabs = [
    { value: 'collections', label: t('tabCollections') },
    { value: 'teams', label: t('tabTeams') },
    { value: 'pages', label: t('tabPages') },
    { value: 'stickers', label: t('tabStickers') },
    { value: 'bulk', label: t('tabBulk') },
    { value: 'users', label: t('tabUsers') },
    { value: 'audit', label: t('tabAudit') },
  ];

  return (
    <div className="min-h-screen bg-[#1F2937]">
      {/* Header */}
      <div className="bg-[#2D3748] border-b-4 border-black">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-black text-white mb-2">{t('title')}</h1>
          <p className="text-gray-300">{t('subtitle')}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-[#2D3748] border-b-4 border-black sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 font-semibold text-sm rounded-md border-2 border-black transition-colors ${
                  activeTab === tab.value
                    ? 'bg-gold text-black'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'collections' && <CollectionsTab />}
        {activeTab === 'teams' && <TeamsTab />}
        {activeTab === 'pages' && <PagesTab />}
        {activeTab === 'stickers' && <StickersTab />}
        {activeTab === 'bulk' && <BulkUploadTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
