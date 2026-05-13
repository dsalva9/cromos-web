'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { legacyFrom, legacyRpc } from '@/types/legacy-tables';
import { useTranslations } from 'next-intl';

type Collection = { id: number; name: string };
type Team = {
  id?: number;
  collection_id: number;
  team_name: string;
  flag_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

export default function TeamsTab() {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.teams');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);

  const sorted = useMemo(() => [...teams].sort((a, b) => (a.team_name || '').localeCompare(b.team_name || '')), [teams]);

  const fetchCollections = useCallback(async () => {
    const { data, error } = await legacyFrom(supabase, 'collections').select('id,name').order('id');
    if (error) { logger.error('Error fetching collections', error); toast(t('errorLoadCollections'), 'error'); return; }
    setCollections(data || []);
    if ((data || []).length > 0) setSelectedCollection(data![0].id);
  }, [supabase, t]);

  useEffect(() => { void fetchCollections(); }, [fetchCollections]);

  const fetchTeams = useCallback(async (collectionId: number) => {
    setLoading(true);
    const { data, error } = await legacyFrom(supabase, 'collection_teams')
      .select('id,collection_id,team_name,flag_url,primary_color,secondary_color')
      .eq('collection_id', collectionId)
      .order('team_name');
    setLoading(false);
    if (error) { logger.error('Error fetching teams', error); toast(t('errorLoadTeams'), 'error'); return; }
    setTeams(data || []);
  }, [supabase, t]);

  useEffect(() => {
    if (selectedCollection) void fetchTeams(selectedCollection);
    else setTeams([]);
  }, [selectedCollection, fetchTeams]);

  function newTeam() {
    if (!selectedCollection) return;
    setEditing({ collection_id: selectedCollection, team_name: '', flag_url: '', primary_color: '', secondary_color: '' });
  }
  function editTeam(team: Team) { setEditing({ ...team }); }
  function cancelEdit() { setEditing(null); }

  async function saveTeam() {
    if (!editing) return;
    if (!editing.collection_id || !editing.team_name) { toast(t('errorRequired'), 'error'); return; }
    const payload = { id: editing.id ?? null, collection_id: editing.collection_id, team_name: editing.team_name, flag_url: editing.flag_url || null, primary_color: editing.primary_color || null, secondary_color: editing.secondary_color || null };
    const { error } = await legacyRpc(supabase, 'admin_upsert_team', { p_team: payload });
    if (error) { logger.error('admin_upsert_team error', error); toast(error.message || t('errorSave'), 'error'); return; }
    toast(t('successSave'), 'success'); setEditing(null); if (selectedCollection) await fetchTeams(selectedCollection);
  }

  async function confirmDeleteTeam() {
    if (!confirmDelete?.id) return;
    const { error } = await legacyRpc(supabase, 'admin_delete_team', { p_team_id: confirmDelete.id });
    if (error) { logger.error('admin_delete_team error', error); toast(error.message || t('errorDelete'), 'error'); return; }
    toast(t('successDelete'), 'success'); setConfirmDelete(null); if (selectedCollection) await fetchTeams(selectedCollection);
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
          <Button onClick={newTeam}>{t('newTeam')}</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">ID</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colName')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colFlagUrl')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colPrimaryColor')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colSecondaryColor')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td className="px-3 py-4" colSpan={6}>{t('loading')}</td></tr>)
              : sorted.length === 0 ? (<tr><td className="px-3 py-4" colSpan={6}>{t('noTeams', { collection: collName })}</td></tr>)
              : sorted.map(team => (
                <tr key={team.id} className="odd:bg-[#2D3748] even:bg-[#253044]">
                  <td className="px-3 py-2 border-b border-black">{team.id}</td>
                  <td className="px-3 py-2 border-b border-black">{team.team_name}</td>
                  <td className="px-3 py-2 border-b border-black">
                    {team.flag_url ? (<a href={team.flag_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">{t('view')}</a>) : '-'}
                  </td>
                  <td className="px-3 py-2 border-b border-black">
                    {team.primary_color ? (<div className="flex items-center gap-2"><div className="w-6 h-6 rounded border-2 border-black" style={{ backgroundColor: team.primary_color }} /><span className="text-xs">{team.primary_color}</span></div>) : '-'}
                  </td>
                  <td className="px-3 py-2 border-b border-black">
                    {team.secondary_color ? (<div className="flex items-center gap-2"><div className="w-6 h-6 rounded border-2 border-black" style={{ backgroundColor: team.secondary_color }} /><span className="text-xs">{team.secondary_color}</span></div>) : '-'}
                  </td>
                  <td className="px-3 py-2 border-b border-black space-x-2">
                    <Button size="sm" onClick={() => editTeam(team)}>{t('edit')}</Button>
                    <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(team)}>{t('delete')}</Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="bg-[#2D3748] border-4 border-black rounded-md p-4 text-white">
          <h3 className="text-xl font-black mb-4">{editing.id ? t('editTeamTitle') : t('newTeamTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm mb-1">{t('collection')}</label>
              <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.collection_id} onChange={e => setEditing({ ...editing, collection_id: Number(e.target.value) })}>
                {collections.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select></div>
            <div><label className="block text-sm mb-1">{t('fieldTeamName')}</label>
              <Input value={editing.team_name} onChange={e => setEditing({ ...editing, team_name: e.target.value })} placeholder={t('placeholderTeamName')} /></div>
            <div><label className="block text-sm mb-1">{t('fieldFlagUrl')}</label>
              <Input value={editing.flag_url ?? ''} onChange={e => setEditing({ ...editing, flag_url: e.target.value })} placeholder="https://..." /></div>
            <div><label className="block text-sm mb-1">{t('fieldPrimaryColor')}</label>
              <div className="flex gap-2">
                <Input type="color" value={editing.primary_color ?? '#FFFFFF'} onChange={e => setEditing({ ...editing, primary_color: e.target.value })} className="w-16" />
                <Input value={editing.primary_color ?? ''} onChange={e => setEditing({ ...editing, primary_color: e.target.value })} placeholder="#FFFFFF" />
              </div></div>
            <div><label className="block text-sm mb-1">{t('fieldSecondaryColor')}</label>
              <div className="flex gap-2">
                <Input type="color" value={editing.secondary_color ?? '#000000'} onChange={e => setEditing({ ...editing, secondary_color: e.target.value })} className="w-16" />
                <Input value={editing.secondary_color ?? ''} onChange={e => setEditing({ ...editing, secondary_color: e.target.value })} placeholder="#000000" />
              </div></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={saveTeam}>{t('save')}</Button>
            <Button variant="secondary" onClick={cancelEdit}>{t('cancel')}</Button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="bg-[#2D3748] border-4 border-black rounded-md p-4 text-white">
          <h3 className="text-xl font-black mb-2">{t('deleteTeamTitle')}</h3>
          <p className="mb-3">{t('deleteTeamConfirm', { name: confirmDelete.team_name, id: String(confirmDelete.id ?? '') })}</p>
          <p className="mb-3 text-yellow-300">⚠️ {t('deleteTeamWarning')}</p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={confirmDeleteTeam}>{t('confirmDelete')}</Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t('cancel')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
