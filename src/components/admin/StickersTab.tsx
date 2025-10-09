'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { convertToFullWebP, convertToThumbWebP, validateImageFile } from '@/lib/imageUtils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

const rarityOptions = [
  { value: 'common', label: 'Común' },
  { value: 'rare', label: 'Raro' },
  { value: 'epic', label: 'Épico' },
  { value: 'legendary', label: 'Legendario' },
];

export default function StickersTab() {
  const supabase = useSupabaseClient();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Sticker | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [imageConfirm, setImageConfirm] = useState<{ type: 'full' | 'thumb' } | null>(null);
  const [imageConfirmOpen, setImageConfirmOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const fetchCollections = useCallback(async () => {
    const { data, error } = await supabase.from('collections').select('id,name').order('id');
    if (error) { logger.error(error); return; }
    setCollections(data || []);
    if ((data || []).length) setSelectedCollection(data![0].id);
  }, [supabase]);

  const fetchTeams = useCallback(async (collectionId: number) => {
    const { data } = await supabase.from('collection_teams').select('id,team_name').eq('collection_id', collectionId).order('team_name');
    setTeams(data || []);
  }, [supabase]);

  const fetchStickers = useCallback(async () => {
    if (!selectedCollection) return;
    setLoading(true);
    let query = supabase
      .from('stickers')
      .select('id,collection_id,team_id,code,player_name,rarity,rating,sticker_number,image_path_webp_300,thumb_path_webp_100')
      .eq('collection_id', selectedCollection);
    if (search) query = query.or(`code.ilike.%${search}%,player_name.ilike.%${search}%`);
    const { data, error } = await query.range(pageIndex * pageSize, pageIndex * pageSize + pageSize - 1);
    setLoading(false);
    if (error) { logger.error(error); toast('Error al cargar cromos', 'error'); return; }
    setStickers(data || []);
  }, [supabase, selectedCollection, search, pageIndex, pageSize]);

  useEffect(() => {
    void fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    if (selectedCollection) {
      void fetchTeams(selectedCollection);
      void fetchStickers();
    } else {
      setTeams([]);
      setStickers([]);
    }
  }, [selectedCollection, fetchTeams, fetchStickers]);

  useEffect(() => {
    void fetchStickers();
  }, [fetchStickers]);

  function newSticker() {
    if (!selectedCollection) return;
    setEditing({ collection_id: selectedCollection, team_id: null, code: '', player_name: '', rarity: 'common', rating: null, sticker_number: null });
    setEditOpen(true);
  }

  function editSticker(s: Sticker) {
    setEditing({ ...s });
    setEditOpen(true);
  }

  function cancelEdit() {
    setEditOpen(false);
    setEditing(null);
  }

  async function saveSticker() {
    if (!editing || !editing.collection_id || !editing.code || !editing.player_name) {
      toast('Completa colección, código y nombre', 'error');
      return;
    }
    const payload = {
      id: editing.id ?? null,
      collection_id: editing.collection_id,
      team_id: editing.team_id ?? null,
      code: editing.code,
      player_name: editing.player_name,
      rarity: editing.rarity,
      rating: editing.rating ?? null,
      sticker_number: editing.sticker_number ?? null,
      image_path_webp_300: editing.image_path_webp_300 ?? null,
      thumb_path_webp_100: editing.thumb_path_webp_100 ?? null,
    };
    const { error } = await supabase.rpc('admin_upsert_sticker', { p_sticker: payload as unknown });
    if (error) { logger.error(error); toast(error.message || 'No se pudo guardar', 'error'); return; }
    toast('Cromo guardado', 'success');
    setEditOpen(false);
    setEditing(null);
    await fetchStickers();
  }

  async function handleUpload(type: 'full' | 'thumb', file: File) {
    if (!editing) return;
    const valid = validateImageFile(file);
    if (!valid.valid) { toast(valid.error || 'Archivo inválido', 'error'); return; }
    try {
      const conv = type === 'full' ? await convertToFullWebP(file) : await convertToThumbWebP(file);
      const blob = conv.blob;
      const webpFile = new File([blob], `${editing.code}_${type}.webp`, { type: 'image/webp' });
      const path = `${editing.collection_id}/${editing.code}_${type}.webp`;
      const { error: upErr } = await supabase.storage.from('sticker-images').upload(path, webpFile, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      if (type === 'full') setEditing({ ...editing, image_path_webp_300: path });
      else setEditing({ ...editing, thumb_path_webp_100: path });
      toast(`Imagen ${type === 'full' ? 'Full' : 'Thumb'} subida`, 'success');
    } catch (e: unknown) {
      logger.error('Upload error', e);
      const msg = e instanceof Error ? e.message : 'No se pudo subir la imagen';
      toast(msg, 'error');
    }
  }

  async function performRemoveImage() {
    if (!editing?.id || !imageConfirm) return;
    const type = imageConfirm.type;
    try {
      const { error } = await supabase.rpc('admin_remove_sticker_image', { p_sticker_id: editing.id, p_type: type });
      if (error) throw error;
      const path = type === 'full' ? editing.image_path_webp_300 : editing.thumb_path_webp_100;
      if (path) {
        const { error: rmErr } = await supabase.storage.from('sticker-images').remove([path]);
        if (rmErr) logger.warn('Storage remove image error (ignored)', rmErr);
      }
      if (type === 'full') setEditing({ ...editing, image_path_webp_300: null });
      else setEditing({ ...editing, thumb_path_webp_100: null });
      toast('Imagen eliminada', 'success');
    } catch (e: unknown) {
      logger.error('remove image error', e);
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar la imagen';
      toast(msg, 'error');
    } finally {
      setImageConfirmOpen(false);
      setImageConfirm(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-2xl font-black text-white">Cromos</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-white">Colección</label>
          <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={selectedCollection ?? ''} onChange={e => { setSelectedCollection(Number(e.target.value) || null); setPageIndex(0); }}>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <label className="text-white">Buscar</label>
          <Input placeholder="Código o jugador…" value={search} onChange={e => { setSearch(e.target.value); setPageIndex(0); }} />
          <label className="text-white">Pág. tamaño</label>
          <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPageIndex(0); }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <Button onClick={newSticker}>Nuevo Cromo</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">Código</th>
              <th className="px-3 py-2 text-left border-b border-black">Jugador</th>
              <th className="px-3 py-2 text-left border-b border-black">Rareza</th>
              <th className="px-3 py-2 text-left border-b border-black">Rating</th>
              <th className="px-3 py-2 text-left border-b border-black">Full</th>
              <th className="px-3 py-2 text-left border-b border-black">Thumb</th>
              <th className="px-3 py-2 text-left border-b border-black">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={7}>Cargando…</td></tr>
            ) : stickers.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={7}>Sin cromos</td></tr>
            ) : (
              stickers.map(s => (
                <tr key={s.id} className="odd:bg-[#2D3748] even:bg-[#253044]">
                  <td className="px-3 py-2 border-b border-black">{s.code}</td>
                  <td className="px-3 py-2 border-b border-black">{s.player_name}</td>
                  <td className="px-3 py-2 border-b border-black">{rarityOptions.find(r => r.value === s.rarity)?.label ?? s.rarity}</td>
                  <td className="px-3 py-2 border-b border-black">{s.rating ?? '-'}</td>
                  <td className="px-3 py-2 border-b border-black">{s.image_path_webp_300 ? '✓' : '—'}</td>
                  <td className="px-3 py-2 border-b border-black">{s.thumb_path_webp_100 ? '✓' : '—'}</td>
                  <td className="px-3 py-2 border-b border-black">
                    <Button size="sm" onClick={() => editSticker(s)}>Editar</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing && editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditing(null); }}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>{editing.id ? 'Editar Cromo' : 'Nuevo Cromo'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Colección</label>
                  <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.collection_id} onChange={e => setEditing({ ...editing, collection_id: Number(e.target.value) })}>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Equipo (opcional)</label>
                  <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.team_id ?? ''} onChange={e => setEditing({ ...editing, team_id: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Sin equipo</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.team_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Código</label>
                  <Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Jugador</label>
                  <Input value={editing.player_name} onChange={e => setEditing({ ...editing, player_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Rareza</label>
                  <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.rarity} onChange={e => setEditing({ ...editing, rarity: e.target.value as Sticker['rarity'] })}>
                    {rarityOptions.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Rating (opcional)</label>
                  <Input type="number" value={editing.rating ?? ''} onChange={e => setEditing({ ...editing, rating: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Número (opcional)</label>
                  <Input type="number" value={editing.sticker_number ?? ''} onChange={e => setEditing({ ...editing, sticker_number: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1F2737] p-3 rounded-md border-2 border-black">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Imagen Full (300px)</h4>
                    {editing.image_path_webp_300 && (
                      <Button size="sm" variant="destructive" onClick={() => { setImageConfirm({ type: 'full' }); setImageConfirmOpen(true); }}>Eliminar imagen</Button>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={e => e.target.files && handleUpload('full', e.target.files[0])} />
                  {editing.image_path_webp_300 && (
                    <p className="text-xs mt-2 break-all">{editing.image_path_webp_300}</p>
                  )}
                </div>
                <div className="bg-[#1F2737] p-3 rounded-md border-2 border-black">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Imagen Thumb (100px)</h4>
                    {editing.thumb_path_webp_100 && (
                      <Button size="sm" variant="destructive" onClick={() => { setImageConfirm({ type: 'thumb' }); setImageConfirmOpen(true); }}>Eliminar imagen</Button>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={e => e.target.files && handleUpload('thumb', e.target.files[0])} />
                  {editing.thumb_path_webp_100 && (
                    <p className="text-xs mt-2 break-all">{editing.thumb_path_webp_100}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={saveSticker}>Guardar</Button>
                <Button variant="secondary" onClick={cancelEdit}>Cancelar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!imageConfirm && imageConfirmOpen} onOpenChange={(open) => { setImageConfirmOpen(open); if (!open) setImageConfirm(null); }}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white">
          {imageConfirm && (
            <>
              <DialogHeader>
                <DialogTitle>Eliminar imagen</DialogTitle>
              </DialogHeader>
              <p>¿Eliminar la imagen {imageConfirm.type === 'full' ? 'Full' : 'Thumb'} de este cromo? Esta acción es irreversible.</p>
              <DialogFooter className="mt-4">
                <Button variant="destructive" onClick={performRemoveImage}>Eliminar</Button>
                <Button variant="secondary" onClick={() => { setImageConfirmOpen(false); setImageConfirm(null); }}>Cancelar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
