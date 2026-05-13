'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { legacyFrom, legacyRpc } from '@/types/legacy-tables';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

type CollectionList = { id: number; name: string };
type Team = { id: number; team_name: string };
type Page = { id?: number; collection_id: number; kind: 'team' | 'special'; team_id?: number | null; title: string; order_index: number };

export default function PagesTab() {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.pages');
  const [collections, setCollections] = useState<CollectionList[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchCollections = useCallback(async () => {
    const { data, error } = await legacyFrom(supabase, 'collections').select('id,name').order('id');
    if (error) { logger.error('Error fetching collections', error); toast(t('errorLoadCollections'), 'error'); return; }
    setCollections(data || []);
    if ((data || []).length > 0) setSelectedCollection(data![0].id);
  }, [supabase, t]);

  useEffect(() => { void fetchCollections(); }, [fetchCollections]);

  const fetchPages = useCallback(async (collectionId: number) => {
    setLoading(true);
    const { data, error } = await legacyFrom(supabase, 'collection_pages')
      .select('id,collection_id,kind,team_id,title,order_index')
      .eq('collection_id', collectionId)
      .order('order_index');
    setLoading(false);
    if (error) { logger.error('Error fetching pages', error); toast(t('errorLoadPages'), 'error'); return; }
    setPages(data || []);
  }, [supabase, t]);

  const fetchTeams = useCallback(async (collectionId: number) => {
    const { data, error } = await legacyFrom(supabase, 'collection_teams').select('id,team_name').eq('collection_id', collectionId).order('team_name');
    if (error) { logger.error('Error fetching teams', error); return; }
    setTeams(data || []);
  }, [supabase]);

  useEffect(() => {
    if (selectedCollection) { void fetchPages(selectedCollection); void fetchTeams(selectedCollection); }
    else { setPages([]); setTeams([]); }
  }, [selectedCollection, fetchPages, fetchTeams]);

  function newPage() {
    if (!selectedCollection) return;
    if (teams.length === 0) { toast(t('errorNoTeams'), 'error'); return; }
    setEditing({ collection_id: selectedCollection, kind: 'team', team_id: null, title: '', order_index: (pages.at(-1)?.order_index ?? 0) + 1 });
    setEditOpen(true);
  }
  function editPage(p: Page) { setEditing({ ...p }); setEditOpen(true); }
  function cancelEdit() { setEditOpen(false); setEditing(null); }

  async function savePage() {
    if (!editing) return;
    if (!editing.collection_id || !editing.kind || !editing.title) { toast(t('errorRequired'), 'error'); return; }
    if (editing.kind === 'team' && !editing.team_id) { toast(t('errorTeamRequired'), 'error'); return; }
    const payload = { id: editing.id ?? null, collection_id: editing.collection_id, kind: editing.kind, team_id: editing.kind === 'team' ? editing.team_id : null, title: editing.title, order_index: editing.order_index ?? 0 };
    const { error } = await legacyRpc(supabase, 'admin_upsert_page', { p_page: payload });
    if (error) { logger.error('admin_upsert_page error', error); toast(error.message || t('errorSave'), 'error'); return; }
    toast(t('successSave'), 'success'); setEditOpen(false); setEditing(null); if (selectedCollection) await fetchPages(selectedCollection);
  }

  async function confirmDeletePage() {
    if (!deleteTarget?.id) return;
    const { error } = await legacyRpc(supabase, 'admin_delete_page', { p_page_id: deleteTarget.id });
    if (error) { logger.error('admin_delete_page error', error); toast(error.message || t('errorDelete'), 'error'); return; }
    toast(t('successDelete'), 'success'); setDeleteOpen(false); setDeleteTarget(null); if (selectedCollection) await fetchPages(selectedCollection);
  }

  const collName = useMemo(() => collections.find(c => c.id === selectedCollection)?.name ?? '', [collections, selectedCollection]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-white">{t('title')}</h2>
        <div className="flex items-center gap-2">
          <label className="text-white">{t('collection')}</label>
          <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={selectedCollection ?? ''} onChange={e => setSelectedCollection(Number(e.target.value) || null)}>
            {collections.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <Button onClick={newPage}>{t('newPage')}</Button>
        </div>
      </div>

      {teams.length === 0 && selectedCollection && (
        <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-md p-3 text-yellow-200">
          <p className="font-semibold">⚠️ {t('noTeamsWarning')}</p>
          <p className="text-sm mt-1">{t('noTeamsHint')}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">{t('colOrder')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colTitle')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colType')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colTeam')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td className="px-3 py-4" colSpan={5}>{t('loading')}</td></tr>)
              : pages.length === 0 ? (<tr><td className="px-3 py-4" colSpan={5}>{t('noPages', { collection: collName })}</td></tr>)
              : pages.map(p => (
                <tr key={p.id} className="odd:bg-[#2D3748] even:bg-[#253044]">
                  <td className="px-3 py-2 border-b border-black">{p.order_index}</td>
                  <td className="px-3 py-2 border-b border-black">{p.title}</td>
                  <td className="px-3 py-2 border-b border-black">{p.kind === 'team' ? t('kindTeam') : t('kindSpecial')}</td>
                  <td className="px-3 py-2 border-b border-black">{p.team_id ?? '-'}</td>
                  <td className="px-3 py-2 border-b border-black space-x-2">
                    <Button size="sm" onClick={() => editPage(p)}>{t('edit')}</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}>{t('delete')}</Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing && editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditing(null); }}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white">
          {editing && (<>
            <DialogHeader><DialogTitle>{editing.id ? t('editPageTitle') : t('newPageTitle')}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm mb-1">{t('collection')}</label>
                <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.collection_id} onChange={e => setEditing({ ...editing, collection_id: Number(e.target.value) })}>
                  {collections.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select></div>
              <div><label className="block text-sm mb-1">{t('fieldType')}</label>
                <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value as Page['kind'], team_id: e.target.value === 'team' ? editing.team_id ?? null : null })}>
                  <option value="team">{t('kindTeam')}</option>
                  <option value="special">{t('kindSpecial')}</option>
                </select></div>
              <div><label className="block text-sm mb-1">{t('colTitle')}</label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><label className="block text-sm mb-1">{t('colOrder')}</label><Input type="number" value={editing.order_index} onChange={e => setEditing({ ...editing, order_index: Number(e.target.value) })} /></div>
              {editing.kind === 'team' && (
                <div className="md:col-span-2"><label className="block text-sm mb-1">{t('teamRequired')}</label>
                  <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.team_id ?? ''} onChange={e => setEditing({ ...editing, team_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">{t('selectTeam')}</option>
                    {teams.map(tm => (<option key={tm.id} value={tm.id}>{tm.team_name}</option>))}
                  </select></div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={savePage}>{t('save')}</Button>
              <Button variant="secondary" onClick={cancelEdit}>{t('cancel')}</Button>
            </DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget && deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white">
          {deleteTarget && (<>
            <DialogHeader><DialogTitle>{t('deletePageTitle')}</DialogTitle></DialogHeader>
            <p>{t('deletePageConfirm', { title: deleteTarget.title, id: String(deleteTarget.id ?? '') })}</p>
            <DialogFooter className="mt-4">
              <Button variant="destructive" onClick={confirmDeletePage}>{t('delete')}</Button>
              <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }}>{t('cancel')}</Button>
            </DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
