'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { useTranslations } from 'next-intl';

type AuditRow = {
  id: number;
  user_id: string;
  admin_nickname: string | null;
  entity: 'collection' | 'page' | 'sticker' | 'image';
  entity_id: number | null;
  action: 'create' | 'update' | 'delete' | 'bulk_upsert' | 'remove_image';
  before_json: unknown;
  after_json: unknown;
  occurred_at: string;
};

export default function AuditTab() {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.audit');
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [entity, setEntity] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const entityOptions = [
    { value: '', label: t('entityAll') },
    { value: 'collection', label: t('entityCollection') },
    { value: 'page', label: t('entityPage') },
    { value: 'sticker', label: t('entitySticker') },
    { value: 'image', label: t('entityImage') },
  ] as const;

  const actionOptions = [
    { value: '', label: t('actionAll') },
    { value: 'create', label: t('actionCreate') },
    { value: 'update', label: t('actionUpdate') },
    { value: 'delete', label: t('actionDelete') },
    { value: 'remove_image', label: t('actionRemoveImage') },
    { value: 'bulk_upsert', label: t('actionBulkUpsert') },
  ] as const;

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_audit_log', {
      p_entity: entity || undefined,
      p_action: action || undefined,
      p_limit: pageSize,
      p_offset: pageIndex * pageSize,
    });
    setLoading(false);
    if (error) {
      logger.error('get_audit_log error', error);
      toast(t('errorLoad'), 'error');
      return;
    }
    setItems(((data as unknown) as AuditRow[]) || []);
  }, [supabase, entity, action, pageSize, pageIndex, t]);

  useEffect(() => { void fetchAudit(); }, [fetchAudit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-black text-white">{t('title')}</h2>
        <label className="text-white">{t('entityLabel')}</label>
        <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={entity} onChange={e => { setEntity(e.target.value); setPageIndex(0); }}>
          {entityOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <label className="text-white">{t('actionLabel')}</label>
        <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={action} onChange={e => { setAction(e.target.value); setPageIndex(0); }}>
          {actionOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <label className="text-white">{t('sizeLabel')}</label>
        <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPageIndex(0); }}>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => { setPageIndex(Math.max(0, pageIndex - 1)); }}>{t('prev')}</Button>
          <Button onClick={() => { setPageIndex(pageIndex + 1); }}>{t('next')}</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">{t('colDate')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colAdmin')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colEntity')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colAction')}</th>
              <th className="px-3 py-2 text-left border-b border-black">ID</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colBefore')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colAfter')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={7}>{t('loading')}</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={7}>{t('noResults')}</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="odd:bg-[#2D3748] even:bg-[#253044] align-top">
                  <td className="px-3 py-2 border-b border-black whitespace-nowrap">{new Date(it.occurred_at).toLocaleString()}</td>
                  <td className="px-3 py-2 border-b border-black">{it.admin_nickname || it.user_id}</td>
                  <td className="px-3 py-2 border-b border-black">{it.entity}</td>
                  <td className="px-3 py-2 border-b border-black">{it.action}</td>
                  <td className="px-3 py-2 border-b border-black">{it.entity_id ?? '-'}</td>
                  <td className="px-3 py-2 border-b border-black max-w-[22rem]">
                    <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(it.before_json, null, 2)}</pre>
                  </td>
                  <td className="px-3 py-2 border-b border-black max-w-[22rem]">
                    <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(it.after_json, null, 2)}</pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
