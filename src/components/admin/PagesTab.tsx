'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CollectionList = { id: number; name: string };

type Team = { id: number; team_name: string };

type Page = { id?: number; collection_id: number; kind: 'team' | 'special'; team_id?: number | null; title: string; order_index: number };

export default function PagesTab() {
  const supabase = useSupabaseClient();
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
    const { data, error } = await (supabase as any).from('collections').select('id,name').order('id');
    if (error) { logger.error('Error fetching collections', error); toast('Error al cargar colecciones', 'error'); return; }
    setCollections(data || []);
    if ((data || []).length > 0) setSelectedCollection(data![0].id);
  }, [supabase]);

  useEffect(() => { void fetchCollections(); }, [fetchCollections]);

  const fetchPages = useCallback(async (collectionId: number) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('collection_pages')
      .select('id,collection_id,kind,team_id,title,order_index')
      .eq('collection_id', collectionId)
      .order('order_index');
    setLoading(false);
    if (error) { logger.error('Error fetching pages', error); toast('Error al cargar páginas', 'error'); return; }
    setPages(data || []);
  }, [supabase]);

  const fetchTeams = useCallback(async (collectionId: number) => {
    const { data, error } = await (supabase as any).from('collection_teams').select('id,team_name').eq('collection_id', collectionId).order('team_name');
    if (error) { logger.error('Error fetching teams', error); return; }
    setTeams(data || []);
  }, [supabase]);

  useEffect(() => {
    if (selectedCollection) { void fetchPages(selectedCollection); void fetchTeams(selectedCollection); }
    else { setPages([]); setTeams([]); }
  }, [selectedCollection, fetchPages, fetchTeams]);

  function newPage() {
    if (!selectedCollection) return;
    if (teams.length === 0) {
      toast('Esta colección no tiene equipos definidos. Añade equipos primero en la pestaña Equipos.', 'error');
      return;
    }
    setEditing({ collection_id: selectedCollection, kind: 'team', team_id: null, title: '', order_index: (pages.at(-1)?.order_index ?? 0) + 1 });
    setEditOpen(true);
  }
  function editPage(p: Page) { setEditing({ ...p }); setEditOpen(true); }
  function cancelEdit() { setEditOpen(false); setEditing(null); }

  async function savePage() {
    if (!editing) return;
    if (!editing.collection_id || !editing.kind || !editing.title) { toast('Completa colección, tipo y título', 'error'); return; }
    if (editing.kind === 'team' && !editing.team_id) { toast('Selecciona un equipo para páginas de tipo equipo', 'error'); return; }
    const payload = { id: editing.id ?? null, collection_id: editing.collection_id, kind: editing.kind, team_id: editing.kind === 'team' ? editing.team_id : null, title: editing.title, order_index: editing.order_index ?? 0 };
    const { error } = await (supabase as any).rpc('admin_upsert_page', { p_page: payload });
    if (error) { logger.error('admin_upsert_page error', error); toast(error.message || 'No se pudo guardar', 'error'); return; }
    toast('Página guardada', 'success'); setEditOpen(false); setEditing(null); if (selectedCollection) await fetchPages(selectedCollection);
  }

  async function confirmDeletePage() {
    if (!deleteTarget?.id) return;
    const { error } = await (supabase as any).rpc('admin_delete_page', { p_page_id: deleteTarget.id });
    if (error) { logger.error('admin_delete_page error', error); toast(error.message || 'No se pudo eliminar', 'error'); return; }
    toast('Página eliminada', 'success'); setDeleteOpen(false); setDeleteTarget(null); if (selectedCollection) await fetchPages(selectedCollection);
  }

  const collName = useMemo(() => collections.find(c => c.id === selectedCollection)?.name ?? '', [collections, selectedCollection]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-white">Páginas</h2>
        <div className="flex items-center gap-2">
          <label className="text-white">Colección</label>
          <select className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1" value={selectedCollection ?? ''} onChange={e => setSelectedCollection(Number(e.target.value) || null)}>
            {collections.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <Button onClick={newPage}>Nueva Página</Button>
        </div>
      </div>

      {teams.length === 0 && selectedCollection && (
        <div className="bg-yellow-900/30 border-2 border-yellow-600 rounded-md p-3 text-yellow-200">
          <p className="font-semibold">⚠️ Esta colección no tiene equipos</p>
          <p className="text-sm mt-1">Debes añadir equipos a esta colección antes de crear páginas. Ve a la pestaña Equipos para gestionar los equipos de cada colección.</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">Orden</th>
              <th className="px-3 py-2 text-left border-b border-black">Título</th>
              <th className="px-3 py-2 text-left border-b border-black">Tipo</th>
              <th className="px-3 py-2 text-left border-b border-black">Equipo</th>
              <th className="px-3 py-2 text-left border-b border-black">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-4" colSpan={5}>Cargando...</td></tr>
            ) : pages.length === 0 ? (
              <tr><td className="px-3 py-4" colSpan={5}>Sin páginas en {collName}</td></tr>
            ) : (
              pages.map(p => (
                <tr key={p.id} className="odd:bg-[#2D3748] even:bg-[#253044]">
                  <td className="px-3 py-2 border-b border-black">{p.order_index}</td>
                  <td className="px-3 py-2 border-b border-black">{p.title}</td>
                  <td className="px-3 py-2 border-b border-black">{p.kind === 'team' ? 'Equipo' : 'Especial'}</td>
                  <td className="px-3 py-2 border-b border-black">{p.team_id ?? '-'}</td>
                  <td className="px-3 py-2 border-b border-black space-x-2">
                    <Button size="sm" onClick={() => editPage(p)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}>Eliminar</Button>
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
                <DialogTitle>{editing.id ? 'Editar Página' : 'Nueva Página'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Colección</label>
                  <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.collection_id} onChange={e => setEditing({ ...editing, collection_id: Number(e.target.value) })}>
                    {collections.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Tipo</label>
                  <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.kind} onChange={e => setEditing({ ...editing, kind: e.target.value as Page['kind'], team_id: e.target.value === 'team' ? editing.team_id ?? null : null })}>
                    <option value="team">Equipo</option>
                    <option value="special">Especial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Título</label>
                  <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Orden</label>
                  <Input type="number" value={editing.order_index} onChange={e => setEditing({ ...editing, order_index: Number(e.target.value) })} />
                </div>
                {editing.kind === 'team' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Equipo (requerido)</label>
                    <select className="w-full bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={editing.team_id ?? ''} onChange={e => setEditing({ ...editing, team_id: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">Selecciona equipo…</option>
                      {teams.map(t => (<option key={t.id} value={t.id}>{t.team_name}</option>))}
                    </select>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={savePage}>Guardar</Button>
                <Button variant="secondary" onClick={cancelEdit}>Cancelar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget && deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="bg-[#2D3748] border-4 border-black text-white">
          {deleteTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Eliminar Página</DialogTitle>
              </DialogHeader>
              <p>Esta acción no se puede deshacer. ¿Eliminar la página &ldquo;{deleteTarget.title}&rdquo; (ID {deleteTarget.id})?</p>
              <DialogFooter className="mt-4">
                <Button variant="destructive" onClick={confirmDeletePage}>Eliminar</Button>
                <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }}>Cancelar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
