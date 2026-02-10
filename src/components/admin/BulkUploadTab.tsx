'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import { legacyFrom, legacyRpc } from '@/types/legacy-tables';
import { convertToFullWebP, convertToThumbWebP } from '@/lib/imageUtils';

type Collection = { id: number; name: string };

type CsvRow = {
  sticker_code: string;
  player_name: string;
  team_name?: string;
  rarity: string;
  rating?: string;
  page_code?: string;
  page_number?: string;
};

type PreparedRow = {
  row: CsvRow;
  rarityStd: 'common' | 'rare' | 'epic' | 'legendary';
  ratingNum: number | null;
};

type JobResult = { code: string; ok: boolean; error?: string };

const rarityMap: Record<string, 'common' | 'rare' | 'epic' | 'legendary'> = {
  'común': 'common', 'comun': 'common', 'common': 'common',
  'raro': 'rare', 'rare': 'rare',
  'épico': 'epic', 'epico': 'epic', 'epic': 'epic',
  'legendario': 'legendary', 'legendary': 'legendary',
};

function parseCSV(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = splitCSVLine(line);
    const obj: Partial<CsvRow> = {};
    header.forEach((h, i) => ((obj as Record<string, string>)[h] = (cols[i] ?? '').trim()));
    return (obj as unknown) as CsvRow;
  });
}

// Splits a CSV line handling simple quoted fields
function splitCSVLine(line: string): string[] {
  const res: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      res.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

export default function BulkUploadTab() {
  const supabase = useSupabaseClient();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [csvText, setCsvText] = useState('');
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [prepared, setPrepared] = useState<PreparedRow[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [overwrite, setOverwrite] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<JobResult[]>([]);



  const fetchCollections = useCallback(async () => {
    const { data, error } = await legacyFrom(supabase, 'collections').select('id,name').order('id');
    if (error) return;
    setCollections(data || []);
    if ((data || []).length) setSelectedCollection(data![0].id);
  }, [supabase]);

  useEffect(() => { void fetchCollections(); }, [fetchCollections]);

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ''));
    reader.readAsText(file, 'utf-8');
  }

  function previewCsv() {
    const rows = parseCSV(csvText);
    setCsvRows(rows);
    const pre: PreparedRow[] = rows.map(r => {
      const rkey = (r.rarity || '').toLowerCase().trim();
      const rarityStd = rarityMap[rkey];
      return {
        row: r,
        rarityStd: rarityStd ?? 'common',
        ratingNum: r.rating ? Number(r.rating) || null : null,
      };
    });
    setPrepared(pre);
  }

  const imageIndex = useMemo(() => {
    const map = new Map<string, File>();
    for (const f of imageFiles) {
      map.set(f.name.toLowerCase(), f);
    }
    return map;
  }, [imageFiles]);

  async function runApply() {
    if (!selectedCollection) {
      toast('Selecciona una colección', 'error');
      return;
    }
    if (prepared.length === 0) {
      toast('No hay datos para procesar', 'error');
      return;
    }
    setRunning(true);
    setResults([]);
    const newResults: JobResult[] = [];

    // Simple concurrency pool
    const pool = 4;
    let idx = 0;
    const workers = new Array(pool).fill(0).map(async () => {
      while (true) {
        const myIdx = idx++;
        if (myIdx >= prepared.length) break;
        const pr = prepared[myIdx];
        const code = pr.row.sticker_code?.trim();
        if (!code) {
          newResults.push({ code: '(vacío)', ok: false, error: 'sticker_code requerido' });
          continue;
        }
        try {
          // Skip duplicates if overwrite is off
          if (!overwrite) {
            const { data: exists } = await legacyFrom(supabase, 'stickers')
              .select('id')
              .eq('collection_id', selectedCollection)
              .eq('code', code)
              .maybeSingle();
            if (exists?.id) {
              newResults.push({ code, ok: true });
              continue;
            }
          }

          // Prepare images by filename convention
          const fullName = `${code}_full`;
          const thumbName = `${code}_thumb`;
          const fullFile = findByBase(imageIndex, fullName);
          const thumbFile = findByBase(imageIndex, thumbName);
          let fullPath: string | null = null;
          let thumbPath: string | null = null;
          if (fullFile) {
            const conv = await convertToFullWebP(fullFile);
            const wf = new File([conv.blob], `${code}_full.webp`, { type: 'image/webp' });
            const path = `${selectedCollection}/${code}_full.webp`;
            const { error: upErr } = await supabase.storage.from('sticker-images').upload(path, wf, { upsert: true, cacheControl: '3600' });
            if (upErr) throw upErr;
            fullPath = path;
          }
          if (thumbFile) {
            const conv = await convertToThumbWebP(thumbFile);
            const wf = new File([conv.blob], `${code}_thumb.webp`, { type: 'image/webp' });
            const path = `${selectedCollection}/${code}_thumb.webp`;
            const { error: upErr } = await supabase.storage.from('sticker-images').upload(path, wf, { upsert: true, cacheControl: '3600' });
            if (upErr) throw upErr;
            thumbPath = path;
          }

          const payload = {
            id: null,
            collection_id: selectedCollection,
            team_id: null,
            code,
            player_name: pr.row.player_name,
            rarity: pr.rarityStd,
            rating: pr.ratingNum,
            sticker_number: null,
            image_path_webp_300: fullPath,
            thumb_path_webp_100: thumbPath,
          };
          const { error } = await legacyRpc(supabase, 'admin_upsert_sticker', { p_sticker: payload });
          if (error) throw error;
          newResults.push({ code, ok: true });
        } catch (e: unknown) {
          logger.error('Bulk row error', e);
          const msg = e instanceof Error ? e.message : 'Error desconocido';
          newResults.push({ code: pr.row.sticker_code, ok: false, error: msg });
        }
      }
    });

    await Promise.all(workers);
    setResults(newResults);
    setRunning(false);
    toast('Carga masiva completada', 'success');
  }

  function findByBase(index: Map<string, File>, base: string): File | null {
    // Accept PNG/JPG/WEBP any extension
    const exts = ['.png', '.jpg', '.jpeg', '.webp'];
    for (const ext of exts) {
      const f = index.get((base + ext).toLowerCase());
      if (f) return f;
    }
    return null;
  }

  const okCount = results.filter(r => r.ok).length;
  const errCount = results.length - okCount;
  const failedRows = results.filter(r => !r.ok).map(r => r.code);

  function downloadTemplate() {
    const template = `sticker_code,player_name,team_name,rarity,rating,page_code,page_number
EX001,Lionel Messi,Argentina,legendario,95,,
EX002,Cristiano Ronaldo,Portugal,épico,94,,
EX003,Kylian Mbappé,Francia,raro,89,,
EX004,Erling Haaland,Noruega,común,87,,`;
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_carga_masiva.csv';
    link.click();
    toast('Plantilla descargada', 'success');
  }

  function retryFailed() {
    if (failedRows.length === 0) return;
    // Filter prepared rows to only keep failed ones
    const failedPrepared = prepared.filter(p => failedRows.includes(p.row.sticker_code));
    setPrepared(failedPrepared);
    setCsvRows(failedPrepared.map(p => p.row));
    setResults([]);
    toast(`Reintentar ${failedRows.length} filas fallidas`, 'info');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <h2 className="text-2xl font-black text-white">Carga Masiva</h2>
        <Button size="sm" variant="secondary" onClick={downloadTemplate}>
          Descargar Plantilla CSV
        </Button>
      </div>

      <div className="bg-[#2D3748] border-4 border-black rounded-md p-4 text-white space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-white">Colección</label>
          <select className="bg-[#1F2737] text-white border-2 border-black rounded-md px-2 py-2" value={selectedCollection ?? ''} onChange={e => setSelectedCollection(Number(e.target.value) || null)}>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2"><input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} /> Sobrescribir existentes</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold mb-2">CSV (metadatos)</p>
            <Input type="file" accept=".csv" onChange={e => e.target.files && handleCsvFile(e.target.files[0])} />
            <div className="mt-2">
              <Button size="sm" onClick={previewCsv}>Previsualizar</Button>
            </div>
            <p className="text-xs mt-2 opacity-80">Cabeceras: sticker_code, player_name, team_name (opcional), rarity, rating (opcional), page_code | page_number (opcional)</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Imágenes (opcional)</p>
            <input type="file" multiple onChange={e => setImageFiles(e.target.files ? Array.from(e.target.files) : [])} />
            <p className="text-xs mt-2 opacity-80">Convención: {'{sticker_code}'}_full.* y {'{sticker_code}'}_thumb.* — Se convierten a WebP (300px / 100px)</p>
          </div>
        </div>
      </div>

      {/* Preview table */}
      {csvRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm bg-[#2D3748] text-white border-4 border-black rounded-md">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-3 py-2 text-left border-b border-black">Código</th>
                <th className="px-3 py-2 text-left border-b border-black">Jugador</th>
                <th className="px-3 py-2 text-left border-b border-black">Rareza</th>
                <th className="px-3 py-2 text-left border-b border-black">Rating</th>
              </tr>
            </thead>
            <tbody>
              {prepared.map(p => (
                <tr key={p.row.sticker_code} className="odd:bg-[#2D3748] even:bg-[#253044]">
                  <td className="px-3 py-2 border-b border-black">{p.row.sticker_code}</td>
                  <td className="px-3 py-2 border-b border-black">{p.row.player_name}</td>
                  <td className="px-3 py-2 border-b border-black">{p.rarityStd}</td>
                  <td className="px-3 py-2 border-b border-black">{p.ratingNum ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button disabled={running || prepared.length === 0} onClick={runApply}>{running ? 'Procesando…' : 'Aplicar'}</Button>
        {errCount > 0 && (
          <Button size="sm" variant="destructive" disabled={running} onClick={retryFailed}>
            Reintentar fallidos ({errCount})
          </Button>
        )}
        {results.length > 0 && <span className="text-white text-sm">OK: {okCount} — Errores: {errCount}</span>}
      </div>

      {results.length > 0 && (
        <div className="bg-[#2D3748] border-4 border-black rounded-md p-3 text-white">
          <p className="font-semibold mb-2">Resumen</p>
          <ul className="text-sm space-y-1 max-h-64 overflow-auto">
            {results.map((r, i) => (
              <li key={i} className={r.ok ? 'text-green-300' : 'text-red-300'}>
                {r.code}: {r.ok ? 'OK' : r.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
