'use client';

import { BroadcastComposer } from '@/components/admin/BroadcastComposer';
import { BroadcastHistory } from '@/components/admin/BroadcastHistory';
import { useTranslations } from 'next-intl';

export default function BroadcastsPage() {
  const t = useTranslations('admin.broadcasts');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase text-white mb-1">{t('title')}</h1>
        <p className="text-gray-400 text-sm">{t('footerNote')}</p>
      </div>

      <div className="space-y-10">
        <BroadcastComposer />
        <BroadcastHistory />
      </div>
    </div>
  );
}
