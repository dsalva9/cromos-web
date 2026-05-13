'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { legacyFrom, legacyRpc } from '@/types/legacy-tables';
import { convertToFullWebP, convertToThumbWebP, validateImageFile } from '@/lib/imageUtils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

type Collection = { id: number; name: string };
type Team = { id: number; team_name: string };
type Sticker = {
  id?: number;
  collection_id: number;
  team_id?: number | null;
  code: string;
  player_name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rating?: number | null;
  sticker_number?: number | null;
  image_path_webp_300?: string | null;
  thumb_path_webp_100?: string | null;
};

export default function StickersTab() {
  const supabase = useSupabaseClient();
  const t = useTranslations('admin.stickers');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Sticker | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [imageConfirm, setImageConfirm] = useState<{ type: 'full' | 'thumb' } | null>(null);
  const [imageConfirmOpen, setImageConfirmOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Sticker | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const rarityOptions = [
    { value: 'common', label: t('rarityCommon') },
    { value: 'rare', label: t('rarityRare') },
    { value: 'epic', label: t('rarityEpic') },
    { value: 'legendary', label: t('rarityLegendary') },
  ];

  const fetchCollections = useCallback(async () => {
    const { data, error } = await legacyFrom(supabase, 'collections').select('id,name').order('id');
    if (error) { logger.error(error); return; }
    setCollections(data || []);
    if ((data || []).length) setSelectedCollection(data![0].id);
  }, [supabase]);

  const fetchTeams = useCallback(async (collectionId: number) => {
    const { data } = await legacyFrom(supabase, 'collection_teams').select('id,team_name').eq('collection_id', collectionId).order('team_name');
    setTeams(data || []);
  }, [supabase]);

  const fetchStickers = useCallback(async () => {
    if (!selectedCollection) return;
    setLoading(true);
    let query = legacyFrom(supabase, 'stickers')
      .select('id,collection_id,team_id,code,player_name,rarity,rating,sticker_number,image_path_webp_300,thumb_path_webp_100')
      .eq('collection_id', selectedCollection);
    if (search) query = query.or(`code.ilike.%${search}%,player_name.ilike.%${search}%`);
    const { data, error } = await query.range(pageIndex * pageSize, pageIndex * pageSize + pageSize - 1);
    setLoading(false);
    if (error) { logger.error(error); toast(t('errorLoad'), 'error'); return; }
    setStickers(data || []);
  }, [supabase, selectedCollection, search, pageIndex, pageSize, t]);

  useEffect(() => { void fetchCollections(); }, [fetchCollections]);
  useEffect(() => {
    if (selectedCollection) { void fetchTeams(selectedCollection); void fetchStickers(); }
    else { setTeams([]); setStickers([]); }
  }, [selectedCollection, fetchTeams, fetchStickers]);
  useEffect(() => { void fetchStickers(); }, [fetchStickers]);

  function newSticker() {
    if (!selectedCollection) return;
    setEditing({ collection_id: selectedCollection, team_id: null, code: '', player_name: '', rarity: 'common', rating: null, sticker_number: null });
    setEditOpen(true);
  }
  function editSticker(s: Sticker) { setEditing({ ...s }); setEditOpen(true); }
  function cancelEdit() { setEditOpen(false); setEditing(null); }

  async function saveSticker() {
    if (!editing || !editing.collection_id || !editing.code || !editing.player_name) {
      toast(t('errorRequired'), 'error'); return;
    }
    const payload = { id: editing.id ?? null, collection_id: editing.collection_id, team_id: editing.team_id ?? null, code: editing.code, player_name: editing.player_name, rarity: editing.rarity, rating: editing.rating ?? null, sticker_number: editing.sticker_number ?? null, image_path_webp_300: editing.image_path_webp_300 ?? null, thumb_path_webp_100: editing.thumb_path_webp_100 ?? null };
    const { error } = await legacyRpc(supabase, 'admin_upsert_sticker', { p_sticker: payload });
    if (error) { logger.error(error); toast(error.message || t('errorSave'), 'error'); return; }
    toast(t('successSave'), 'success'); setEditOpen(false); setEditing(null); await fetchStickers();
  }

  async function handleUpload(type: 'full' | 'thumb', file: File) {
    if (!editing) return;
    const valid = validateImageFile(file);
    if (!valid.valid) { toast(valid.error || t('errorInvalidFile'), 'error'); return; }
    try {
      const conv = type === 'full' ? await convertToFullWebP(file) : await convertToThumbWebP(file);
      const webpFile = new File([conv.blob], `${editing.code}_${type}.webp`, { type: 'image/webp' });
      const path = `${editing.collection_id}/${editing.code}_${type}.webp`;
      const { error: upErr } = await supabase.storage.from('sticker-images').upload(path, webpFile, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      if (type === 'full') setEditing({ ...editing, image_path_webp_300: path });
      else setEditing({ ...editing, thumb_path_webp_100: path });
      toast(t('successImageUpload', { type: type === 'full' ? 'Full' : 'Thumb' }), 'success');
    } catch (e: unknown) {
      logger.error('Upload error', e);
      toast(e instanceof Error ? e.message : t('errorImageUpload'), 'error');
    }
  }

  async function performRemoveImage() {
    if (!editing?.id || !imageConfirm) return;
    const type = imageConfirm.type;
    try {
      const { error } = await legacyRpc(supabase, 'admin_remove_sticker_image', { p_sticker_id: editing.id, p_type: type });
      if (error) throw error;
      const path = type === 'full' ? editing.image_path_webp_300 : editing.thumb_path_webp_100;
      if (path) await supabase.storage.from('sticker-images').remove([path]);
      if (type === 'full') setEditing({ ...editing, image_path_webp_300: null });
      else setEditing({ ...editing, thumb_path_webp_100: null });
      toast(t('successImageRemove'), 'success');
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : t('errorImageRemove'), 'error');
    } finally { setImageConfirmOpen(false); setImageConfirm(null); }
  }

  async function performDeleteSticker() {
    if (!deleteConfirm?.id) return;
    try {
      const { error } = await legacyRpc(supabase, 'admin_delete_sticker', { p_sticker_id: deleteConfirm.id });
      if (error) throw error;
      const imgs = [deleteConfirm.image_path_webp_300, deleteConfirm.thumb_path_webp_100].filter(Boolean) as string[];
      if (imgs.length) await supabase.storage.from('sticker-images').remove(imgs);
      toast(t('successDelete'), 'success'); setDeleteConfirmOpen(false); setDeleteConfirm(null); await fetchStickers();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : t('errorDelete'), 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-2xl font-black text-white">{t('title')}</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-white">{t('collection')}</label>
          <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={selectedCollection ?? ''} onChange={e => { setSelectedCollection(Number(e.target.value) || null); setPageIndex(0); }}>
            {collections.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <label className="text-white">{t('search')}</label>
          <Input placeholder={t('searchPlaceholder')} value={search} onChange={e => { setSearch(e.target.value); setPageIndex(0); }} />
          <label className="text-white">{t('pageSize')}</label>
          <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPageIndex(0); }}>
            <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
          </select>
          <Button onClick={newSticker}>{t('newSticker')}</Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setPageIndex(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0}>{t('prev')}</Button>
        <Button onClick={() => setPageIndex(pageIndex + 1)} disabled={stickers.length < pageSize}>{t('next')}</Button>
        <span className="text-white text-sm self-center ml-2">{t('page', { page: pageIndex + 1 })}</span>
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
              <th className="px-3 py-2 text-left border-b border-black">{t('colCode')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colPlayer')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colRarity')}</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colRating')}</th>
              <th className="px-3 py-2 text-left border-b border-black">Full</th>
              <th className="px-3 py-2 text-left border-b border-black">Thumb</th>
              <th className="px-3 py-2 text-left border-b border-black">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (<tr><td className="px-3 py-4" colSpan={7}>{t('loading')}</td></tr>)
              : stickers.length === 0 ? (<tr><td className="px-3 py-4" colSpan={7}>{t('noStickers')}</td></tr>)
              : stickers.map(s => (
                <tr key={s.id} className="odd:bg-[#2D3748] even:bg-[#253044]">
                  <td className="px-3 py-2 border-b border-black">{s.code}</td>
                  <td className="px-3 py-2 border-b border-black">{s.player_name}</td>
                  <td className="px-3 py-2 border-b border-black">{rarityOptions.find(r => r.value === s.rarity)?.label ?? s.rarity}</td>
                  <td className="px-3 py-2 border-b border-black">{s.rating ?? '-'}</td>
                  <td className="px-3 py-2 border-b border-black">{s.image_path_webp_300 ? '✓' : '—'}</td>
                  <td className="px-3 py-2 border-b border-black">{s.thumb_path_webp_100 ? '✓' : '—'}</td>
                  <td className="px-3 py-2 border-b border-black">
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" onClick={() => editSticker(s)}>{t('edit')}</Button>
                      <Button size="sm" variant="destructive" onClick={() => { setDeleteConfirm(s); setDeleteConfirmOpen(true); }}>{t('delete')}</Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing && editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditing(null); }}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white">
          {editing && (<>
            <DialogHeader><DialogTitle>{editing.id ? t('editStickerTitle') : t('newStickerTitle')}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm mb-1">{t('collection')}</label>
                <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.collection_id} onChange={e => setEditing({ ...editing, collection_id: Number(e.target.value) })}>
                  {collections.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select></div>
              <div><label className="block text-sm mb-1">{t('teamOptional')}</label>
                <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.team_id ?? ''} onChange={e => setEditing({ ...editing, team_id: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">{t('noTeam')}</option>
                  {teams.map(tm => (<option key={tm.id} value={tm.id}>{tm.team_name}</option>))}
                </select></div>
              <div><label className="block text-sm mb-1">{t('code')}</label><Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="block text-sm mb-1">{t('player')}</label><Input value={editing.player_name} onChange={e => setEditing({ ...editing, player_name: e.target.value })} /></div>
              <div><label className="block text-sm mb-1">{t('colRarity')}</label>
                <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.rarity} onChange={e => setEditing({ ...editing, rarity: e.target.value as Sticker['rarity'] })}>
                  {rarityOptions.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select></div>
              <div><label className="block text-sm mb-1">{t('ratingOptional')}</label><Input type="number" value={editing.rating ?? ''} onChange={e => setEditing({ ...editing, rating: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><label className="block text-sm mb-1">{t('numberOptional')}</label><Input type="number" value={editing.sticker_number ?? ''} onChange={e => setEditing({ ...editing, sticker_number: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#1F2737] p-3 rounded-md border-2 border-black">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{t('imageFull')}</h4>
                  {editing.image_path_webp_300 && (<Button size="sm" variant="destructive" onClick={() => { setImageConfirm({ type: 'full' }); setImageConfirmOpen(true); }}>{t('removeImage')}</Button>)}
                </div>
                <input type="file" accept="image/*" onChange={e => e.target.files && handleUpload('full', e.target.files[0])} />
                {editing.image_path_webp_300 && (<p className="text-xs mt-2 break-all">{editing.image_path_webp_300}</p>)}
              </div>
              <div className="bg-[#1F2737] p-3 rounded-md border-2 border-black">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{t('imageThumb')}</h4>
                  {editing.thumb_path_webp_100 && (<Button size="sm" variant="destructive" onClick={() => { setImageConfirm({ type: 'thumb' }); setImageConfirmOpen(true); }}>{t('removeImage')}</Button>)}
                </div>
                <input type="file" accept="image/*" onChange={e => e.target.files && handleUpload('thumb', e.target.files[0])} />
                {editing.thumb_path_webp_100 && (<p className="text-xs mt-2 break-all">{editing.thumb_path_webp_100}</p>)}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={saveSticker}>{t('save')}</Button>
              <Button variant="secondary" onClick={cancelEdit}>{t('cancel')}</Button>
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!imageConfirm && imageConfirmOpen} onOpenChange={(open) => { setImageConfirmOpen(open); if (!open) setImageConfirm(null); }}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white">
          {imageConfirm && (<>
            <DialogHeader><DialogTitle>{t('removeImageTitle')}</DialogTitle></DialogHeader>
            <p>{t('removeImageConfirm', { type: imageConfirm.type === 'full' ? 'Full' : 'Thumb' })}</p>
            <DialogFooter className="mt-4">
              <Button variant="destructive" onClick={performRemoveImage}>{t('delete')}</Button>
              <Button variant="secondary" onClick={() => { setImageConfirmOpen(false); setImageConfirm(null); }}>{t('cancel')}</Button>
            </DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm && deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setDeleteConfirm(null); }}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white">
          {deleteConfirm && (<>
            <DialogHeader><DialogTitle>{t('deleteStickerTitle')}</DialogTitle></DialogHeader>
            <p>{t('deleteStickerConfirm', { code: deleteConfirm.code, name: deleteConfirm.player_name })}</p>
            <DialogFooter className="mt-4">
              <Button variant="destructive" onClick={performDeleteSticker}>{t('delete')}</Button>
              <Button variant="secondary" onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirm(null); }}>{t('cancel')}</Button>
            </DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
