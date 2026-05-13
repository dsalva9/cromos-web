'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { legacyFrom, legacyRpc } from '@/types/legacy-tables';
import { useTranslations } from 'next-intl';

type Collection = {
  id?: number;
  name: string;
  competition: string;
  year: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
};

type StorageFile = { name: string; id?: string | null; updated_at?: string; created_at?: string; last_accessed_at?: string; metadata?: unknown };

export default function CollectionsTab() {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.collections');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ collection: Collection; files: StorageFile[]; total: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(() => [...collections].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)), [collections]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    const { data, error } = await legacyFrom(supabase, 'collections')
      .select('id,name,competition,year,description,image_url,is_active')
      .order('id');
    setLoading(false);
    if (error) { logger.error('Error fetching collections', error); toast(t('errorLoad'), 'error'); return; }
    setCollections(data || []);
  }, [supabase, t]);

  useEffect(() => { void fetchCollections(); }, [fetchCollections]);

  function newCollection() { setEditing({ name: '', competition: '', year: '', description: '', image_url: '', is_active: true }); }
  function editCollection(col: Collection) { setEditing({ ...col }); }
  function cancelEdit() { setEditing(null); }

  async function saveCollection() {
    if (!editing) return;
    if (!editing.name || !editing.competition || !editing.year) { toast(t('errorRequiredFields'), 'error'); return; }
    const payload = { id: editing.id ?? null, name: editing.name, competition: editing.competition, year: editing.year, description: editing.description ?? null, image_url: editing.image_url ?? null, is_active: editing.is_active ?? true };
    const { error } = await legacyRpc(supabase, 'admin_upsert_collection', { p_collection: payload });
    if (error) { logger.error('admin_upsert_collection error', error); toast(error.message || t('errorSave'), 'error'); return; }
    toast(t('successSave'), 'success'); setEditing(null); await fetchCollections();
  }

  async function preflightDelete(col: Collection) {
    if (!col.id) return;
    try {
      const { files, total } = await listAllUnderPrefix(`${col.id}`);
      setConfirmDelete({ collection: col, files: files.slice(0, 10), total });
    } catch (e) {
      logger.warn('Preflight list failed, proceeding with 0 files', e);
      setConfirmDelete({ collection: col, files: [], total: 0 });
    }
  }

  async function confirmAndDelete() {
    if (!confirmDelete?.collection.id) return;
    setDeleting(true);
    try {
      const { error: dbErr } = await supabase.rpc('admin_delete_collection', { p_collection_id: confirmDelete.collection.id });
      if (dbErr) throw dbErr;
      const removed = await removeAllUnderPrefix(`${confirmDelete.collection.id}`);
      toast(t('successDelete', { count: removed }), 'success');
    } catch (error) {
      logger.error('Error deleting collection', error);
      const msg = error instanceof Error ? error.message : t('errorDelete');
      toast(msg, 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
      await fetchCollections();
    }
  }

  async function listAllUnderPrefix(prefix: string): Promise<{ files: StorageFile[]; total: number }> {
    const bucket = supabase.storage.from('sticker-images');
    const pageSize = 100;
    let offset = 0;
    let all: StorageFile[] = [];
    while (true) {
      const { data, error } = await bucket.list(prefix, { limit: pageSize, offset });
      if (error) throw error;
      const page = ((data as unknown) as StorageFile[]) || [];
      all = all.concat(page);
      if (!data || page.length < pageSize) break;
      offset += pageSize;
    }
    return { files: all, total: all.length };
  }

  async function removeAllUnderPrefix(prefix: string): Promise<number> {
    const bucket = supabase.storage.from('sticker-images');
    const { files } = await listAllUnderPrefix(prefix);
    if (!files.length) return 0;
    const paths = files.map(f => `${prefix}/${f.name}`);
    const batchSize = 100;
    let removed = 0;
    for (let i = 0; i < paths.length; i += batchSize) {
      const chunk = paths.slice(i, i + batchSize);
      const { error } = await bucket.remove(chunk);
      if (error) logger.warn('Storage remove chunk error', error);
      removed += chunk.length;
    }
    return removed;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">{t('title')}</h2>
        <Button onClick={newCollection}>{t('newCollection')}</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">ID</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colName')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colCompetition')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colYear')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colActive')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={6}>{t('loading')}</td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={6}>{t('noCollections')}</td>
              </tr>
            ) : (
              sorted.map(col => (
                <tr key={col.id} className="odd:bg-[#2D3748] even:bg-[#253044]">
                  <td className="px-3 py-2 border-b border-black">{col.id}</td>
                  <td className="px-3 py-2 border-b border-black">{col.name}</td>
                  <td className="px-3 py-2 border-b border-black">{col.competition}</td>
                  <td className="px-3 py-2 border-b border-black">{col.year}</td>
                  <td className="px-3 py-2 border-b border-black">
                    {col.is_active ? (
                      <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">{t('statusPublished')}</span>
                    ) : (
                      <span className="bg-gray-600 text-white px-2 py-0.5 rounded text-xs font-bold">{t('statusDraft')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border-b border-black space-x-2">
                    <Button size="sm" onClick={() => editCollection(col)}>{t('edit')}</Button>
                    <Button size="sm" variant="destructive" onClick={() => preflightDelete(col)}>{t('delete')}</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="bg-[#2D3748] border-4 border-black rounded-md p-4 text-white">
          <h3 className="text-xl font-black mb-4">{editing.id ? t('editTitle') : t('newTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">{t('fieldName')}</label>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('fieldCompetition')}</label>
              <Input value={editing.competition} onChange={e => setEditing({ ...editing, competition: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('fieldYear')}</label>
              <Input value={editing.year} onChange={e => setEditing({ ...editing, year: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1">{t('fieldImageUrl')}</label>
              <Input value={editing.image_url ?? ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">{t('fieldDescription')}</label>
              <Input value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input id="is_active" type="checkbox" checked={!!editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
              <label htmlFor="is_active">{t('fieldPublished')}</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={saveCollection}>{t('save')}</Button>
            <Button variant="secondary" onClick={cancelEdit}>{t('cancel')}</Button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="bg-[#2D3748] border-4 border-black rounded-md p-4 text-white">
          <h3 className="text-xl font-black mb-2">{t('deleteCollectionTitle')}</h3>
          <p className="mb-3">{t('deleteWarning')} <code className="bg-black/30 px-1">sticker-images/{confirmDelete.collection.id}/</code>.</p>
          <p className="mb-3">{t('filesFound')}: <strong>{confirmDelete.total}</strong></p>
          {confirmDelete.files.length > 0 && (
            <div className="mb-3">
              <p className="font-semibold mb-1">{t('fileSample')}</p>
              <ul className="list-disc ml-6 text-sm">
                {confirmDelete.files.map((f) => (<li key={f.name}>{f.name}</li>))}
              </ul>
              {confirmDelete.total > confirmDelete.files.length && (
                <p className="text-sm mt-1">{t('andMore', { count: confirmDelete.total - confirmDelete.files.length })}</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={deleting} onClick={confirmAndDelete}>{deleting ? t('deleting') : t('confirmDelete')}</Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t('cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
