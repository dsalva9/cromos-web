'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ collection: Collection; files: StorageFile[]; total: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(() => [...collections].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)), [collections]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('collections')
      .select('id,name,competition,year,description,image_url,is_active')
      .order('id');
    setLoading(false);
    if (error) { logger.error('Error fetching collections', error); toast('Error al cargar colecciones', 'error'); return; }
    setCollections(data || []);
  }, [supabase]);

  useEffect(() => { void fetchCollections(); }, [fetchCollections]);

  function newCollection() { setEditing({ name: '', competition: '', year: '', description: '', image_url: '', is_active: true }); }
  function editCollection(col: Collection) { setEditing({ ...col }); }
  function cancelEdit() { setEditing(null); }

  async function saveCollection() {
    if (!editing) return;
    if (!editing.name || !editing.competition || !editing.year) { toast('Completa nombre, competición y año', 'error'); return; }
    const payload = { id: editing.id ?? null, name: editing.name, competition: editing.competition, year: editing.year, description: editing.description ?? null, image_url: editing.image_url ?? null, is_active: editing.is_active ?? true };
    const { error } = await supabase.rpc('admin_upsert_collection', { p_collection: payload as unknown });
    if (error) { logger.error('admin_upsert_collection error', error); toast(error.message || 'No se pudo guardar', 'error'); return; }
    toast('Colección guardada', 'success'); setEditing(null); await fetchCollections();
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
      toast(`Colección eliminada (${removed} archivos borrados)`, 'success');
    } catch (error) {
      logger.error('Error deleting collection', error);
      const msg = error instanceof Error ? error.message : 'Error al eliminar la colección';
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
        <h2 className="text-2xl font-black text-white">Colecciones</h2>
        <Button onClick={newCollection}>Nueva Colección</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-3 py-2 text-left border-b border-black">ID</th>
              <th className="px-3 py-2 text-left border-b border-black">Nombre</th>
              <th className="px-3 py-2 text-left border-b border-black">Competición</th>
              <th className="px-3 py-2 text-left border-b border-black">Año</th>
              <th className="px-3 py-2 text-left border-b border-black">Activa</th>
              <th className="px-3 py-2 text-left border-b border-black">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={6}>Cargando...</td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={6}>Sin colecciones</td>
              </tr>
            ) : (
              sorted.map(col => (
                <tr key={col.id} className="odd:bg-[#2D3748] even:bg-[#253044]">
                  <td className="px-3 py-2 border-b border-black">{col.id}</td>
                  <td className="px-3 py-2 border-b border-black">{col.name}</td>
                  <td className="px-3 py-2 border-b border-black">{col.competition}</td>
                  <td className="px-3 py-2 border-b border-black">{col.year}</td>
                  <td className="px-3 py-2 border-b border-black">{col.is_active ? 'Sí' : 'No'}</td>
                  <td className="px-3 py-2 border-b border-black space-x-2">
                    <Button size="sm" onClick={() => editCollection(col)}>Editar</Button>
                    <Button size="sm" variant="destructive" onClick={() => preflightDelete(col)}>Eliminar</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="bg-[#2D3748] border-4 border-black rounded-md p-4 text-white">
          <h3 className="text-xl font-black mb-4">{editing.id ? 'Editar Colección' : 'Nueva Colección'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Competición</label>
              <Input value={editing.competition} onChange={e => setEditing({ ...editing, competition: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1">Año</label>
              <Input value={editing.year} onChange={e => setEditing({ ...editing, year: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1">URL Imagen</label>
              <Input value={editing.image_url ?? ''} onChange={e => setEditing({ ...editing, image_url: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Descripción</label>
              <Input value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input id="is_active" type="checkbox" checked={!!editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
              <label htmlFor="is_active">Publicado (visible)</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={saveCollection}>Guardar</Button>
            <Button variant="secondary" onClick={cancelEdit}>Cancelar</Button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="bg-[#2D3748] border-4 border-black rounded-md p-4 text-white">
          <h3 className="text-xl font-black mb-2">Eliminar Colección</h3>
          <p className="mb-3">Esta acción es irreversible y eliminará la carpeta de imágenes <code className="bg-black/30 px-1">sticker-images/{confirmDelete.collection.id}/</code>.</p>
          <p className="mb-3">Archivos encontrados: <strong>{confirmDelete.total}</strong></p>
          {confirmDelete.files.length > 0 && (
            <div className="mb-3">
              <p className="font-semibold mb-1">Muestra (hasta 10):</p>
              <ul className="list-disc ml-6 text-sm">
                {confirmDelete.files.map((f) => (<li key={f.name}>{f.name}</li>))}
              </ul>
              {confirmDelete.total > confirmDelete.files.length && (
                <p className="text-sm mt-1">…y {confirmDelete.total - confirmDelete.files.length} más</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" disabled={deleting} onClick={confirmAndDelete}>{deleting ? 'Eliminando…' : 'Sí, eliminar definitivamente'}</Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
