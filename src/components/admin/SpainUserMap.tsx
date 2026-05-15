'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

/* ─── Province coords (first 2 digits of postcode) ─────────────────── */
const PROVINCE_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  '01': { lat: 42.85, lng: -2.67, name: 'Álava' },
  '02': { lat: 38.99, lng: -1.86, name: 'Albacete' },
  '03': { lat: 38.35, lng: -0.48, name: 'Alicante' },
  '04': { lat: 36.84, lng: -2.46, name: 'Almería' },
  '05': { lat: 40.66, lng: -4.70, name: 'Ávila' },
  '06': { lat: 38.88, lng: -6.97, name: 'Badajoz' },
  '07': { lat: 39.57, lng: 2.65, name: 'Baleares' },
  '08': { lat: 41.39, lng: 2.17, name: 'Barcelona' },
  '09': { lat: 42.34, lng: -3.70, name: 'Burgos' },
  '10': { lat: 39.47, lng: -6.37, name: 'Cáceres' },
  '11': { lat: 36.53, lng: -6.29, name: 'Cádiz' },
  '12': { lat: 39.99, lng: -0.04, name: 'Castellón' },
  '13': { lat: 38.99, lng: -3.93, name: 'Ciudad Real' },
  '14': { lat: 37.88, lng: -4.78, name: 'Córdoba' },
  '15': { lat: 43.37, lng: -8.40, name: 'A Coruña' },
  '16': { lat: 40.07, lng: -2.14, name: 'Cuenca' },
  '17': { lat: 41.98, lng: 2.82, name: 'Girona' },
  '18': { lat: 37.18, lng: -3.60, name: 'Granada' },
  '19': { lat: 40.63, lng: -3.17, name: 'Guadalajara' },
  '20': { lat: 43.32, lng: -1.98, name: 'Gipuzkoa' },
  '21': { lat: 37.26, lng: -6.95, name: 'Huelva' },
  '22': { lat: 42.14, lng: -0.41, name: 'Huesca' },
  '23': { lat: 37.77, lng: -3.79, name: 'Jaén' },
  '24': { lat: 42.60, lng: -5.57, name: 'León' },
  '25': { lat: 41.62, lng: 0.63, name: 'Lleida' },
  '26': { lat: 42.47, lng: -2.45, name: 'La Rioja' },
  '27': { lat: 43.01, lng: -7.56, name: 'Lugo' },
  '28': { lat: 40.42, lng: -3.70, name: 'Madrid' },
  '29': { lat: 36.72, lng: -4.42, name: 'Málaga' },
  '30': { lat: 37.98, lng: -1.13, name: 'Murcia' },
  '31': { lat: 42.82, lng: -1.65, name: 'Navarra' },
  '32': { lat: 42.34, lng: -7.86, name: 'Ourense' },
  '33': { lat: 43.36, lng: -5.85, name: 'Asturias' },
  '34': { lat: 42.01, lng: -4.53, name: 'Palencia' },
  '35': { lat: 28.10, lng: -15.41, name: 'Las Palmas' },
  '36': { lat: 42.43, lng: -8.65, name: 'Pontevedra' },
  '37': { lat: 40.96, lng: -5.66, name: 'Salamanca' },
  '38': { lat: 28.47, lng: -16.25, name: 'S/C Tenerife' },
  '39': { lat: 43.46, lng: -3.81, name: 'Cantabria' },
  '40': { lat: 40.95, lng: -4.12, name: 'Segovia' },
  '41': { lat: 37.39, lng: -5.99, name: 'Sevilla' },
  '42': { lat: 41.76, lng: -2.46, name: 'Soria' },
  '43': { lat: 41.12, lng: 1.25, name: 'Tarragona' },
  '44': { lat: 40.34, lng: -1.11, name: 'Teruel' },
  '45': { lat: 39.86, lng: -4.03, name: 'Toledo' },
  '46': { lat: 39.47, lng: -0.38, name: 'Valencia' },
  '47': { lat: 41.65, lng: -4.72, name: 'Valladolid' },
  '48': { lat: 43.26, lng: -2.92, name: 'Bizkaia' },
  '49': { lat: 41.50, lng: -5.75, name: 'Zamora' },
  '50': { lat: 41.65, lng: -0.88, name: 'Zaragoza' },
  '51': { lat: 35.89, lng: -5.32, name: 'Ceuta' },
  '52': { lat: 35.29, lng: -2.94, name: 'Melilla' },
};

/* ─── Province → Comunidad Autónoma mapping ────────────────────────── */
const PROVINCE_TO_CCAA: Record<string, string> = {
  '01': 'PV', '20': 'PV', '48': 'PV',
  '02': 'CM', '13': 'CM', '16': 'CM', '19': 'CM', '45': 'CM',
  '03': 'VC', '12': 'VC', '46': 'VC',
  '04': 'AN', '11': 'AN', '14': 'AN', '18': 'AN', '21': 'AN', '23': 'AN', '29': 'AN', '41': 'AN',
  '05': 'CL', '09': 'CL', '24': 'CL', '34': 'CL', '37': 'CL', '40': 'CL', '42': 'CL', '47': 'CL', '49': 'CL',
  '06': 'EX', '10': 'EX',
  '07': 'IB',
  '08': 'CT', '17': 'CT', '25': 'CT', '43': 'CT',
  '15': 'GA', '27': 'GA', '32': 'GA', '36': 'GA',
  '22': 'AR', '44': 'AR', '50': 'AR',
  '26': 'RI', '28': 'MD', '30': 'MU', '31': 'NA', '33': 'AS',
  '35': 'CN', '38': 'CN', '39': 'CB', '51': 'CE', '52': 'ML',
};

const CCAA_NAMES: Record<string, string> = {
  AN: 'Andalucía', AR: 'Aragón', AS: 'Asturias', IB: 'Illes Balears',
  CN: 'Canarias', CB: 'Cantabria', CL: 'Castilla y León', CM: 'Castilla-La Mancha',
  CT: 'Cataluña', VC: 'Com. Valenciana', EX: 'Extremadura', GA: 'Galicia',
  MD: 'Madrid', MU: 'Murcia', NA: 'Navarra', PV: 'País Vasco',
  RI: 'La Rioja', CE: 'Ceuta', ML: 'Melilla',
};

/* ─── Geo projection ───────────────────────────────────────────────── */
const MAP = { latMin: 35.5, latMax: 44.0, lngMin: -9.8, lngMax: 4.8 };
const W = 600, H = 430, PAD = 20;
const CANARY_OFF = { x: 60, y: 380 };
const CANARY_CODES = new Set(['35', '38']);

function proj(lat: number, lng: number, code?: string): [number, number] {
  if (code && CANARY_CODES.has(code)) {
    const x = CANARY_OFF.x + ((lng - (-18.5)) / 5.5) * 130;
    const y = CANARY_OFF.y + ((29.5 - lat) / 2.0) * 55;
    return [x, y];
  }
  const x = PAD + ((lng - MAP.lngMin) / (MAP.lngMax - MAP.lngMin)) * (W - 2 * PAD);
  const y = PAD + ((MAP.latMax - lat) / (MAP.latMax - MAP.latMin)) * (H - 2 * PAD);
  return [x, y];
}

function polyPath(pts: [number, number][]): string {
  return pts.map(([lat, lng], i) => {
    const [x, y] = proj(lat, lng);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + 'Z';
}

/* ─── Spain outline as lat/lng polygons ────────────────────────────── */
// Mainland – clockwise from NW Galicia
const MAINLAND: [number, number][] = [
  [43.79,-7.87],[43.65,-8.17],[43.37,-8.40],[43.19,-8.81],[42.88,-9.27],
  [42.44,-8.87],[42.12,-8.85],[41.87,-8.88],[41.87,-8.17],[41.80,-7.90],
  [41.38,-7.43],[41.08,-8.17],[40.40,-7.60],[39.66,-7.55],[39.47,-7.53],
  [39.02,-7.50],[38.73,-7.41],[38.18,-7.00],[37.53,-7.44],[37.17,-7.41],
  [36.98,-7.43],[36.78,-7.00],[36.48,-6.36],[36.14,-5.68],[36.00,-5.61],
  [36.01,-5.35],[36.13,-5.44],[36.18,-5.36],[36.07,-5.32],[36.07,-5.23],
  [36.39,-5.14],[36.72,-4.42],[36.72,-3.83],[36.73,-3.18],[36.75,-2.64],
  [36.84,-2.43],[37.10,-1.88],[37.56,-1.63],[37.63,-0.96],[37.82,-0.75],
  [38.00,-0.69],[38.13,-0.52],[38.35,-0.49],[38.54,-0.13],[38.75,0.17],
  [38.91,0.00],[39.05,-0.20],[39.47,-0.33],[39.50,0.15],[39.87,0.20],
  [40.08,0.10],[40.43,0.32],[40.53,0.48],[40.62,0.60],[40.74,0.69],
  [41.08,1.20],[41.18,1.42],[41.27,1.98],[41.37,2.17],[41.58,2.52],
  [41.72,2.72],[42.01,3.05],[42.32,3.15],[42.43,3.18],
  [42.50,3.05],[42.60,2.70],[42.68,2.00],[42.65,1.40],[42.73,0.73],
  [42.77,0.30],[42.82,-0.30],[42.88,-0.70],[42.93,-1.30],[43.08,-1.40],
  [43.27,-1.78],[43.32,-1.79],[43.38,-1.93],[43.40,-2.40],[43.32,-2.93],
  [43.42,-3.45],[43.46,-3.81],[43.40,-4.05],[43.38,-4.51],[43.34,-5.00],
  [43.55,-5.60],[43.56,-5.85],[43.54,-6.40],[43.56,-6.85],[43.65,-7.27],
  [43.66,-7.60],
];

// Balearic Islands (simplified)
const MALLORCA: [number, number][] = [
  [39.96,2.39],[39.87,3.08],[39.72,3.44],[39.45,3.48],[39.27,3.18],
  [39.26,2.70],[39.35,2.35],[39.55,2.31],[39.78,2.32],
];
const IBIZA: [number, number][] = [
  [39.08,1.21],[38.98,1.55],[38.84,1.58],[38.84,1.20],[38.93,1.18],
];

// Canary Islands (simplified outlines for inset)
const TENERIFE: [number, number][] = [
  [28.53,-16.60],[28.10,-16.80],[28.00,-16.52],[28.05,-16.12],[28.38,-16.13],[28.53,-16.42],
];
const GRAN_CANARIA: [number, number][] = [
  [28.17,-15.70],[27.97,-15.72],[27.75,-15.57],[27.74,-15.38],[27.92,-15.36],[28.15,-15.43],
];

/* ─── Main component ───────────────────────────────────────────────── */
export default function SpainUserMap({ days }: { days: number | null }) {
  const supabase = useSupabaseClient();
  const [data, setData] = useState<{ province_code: string; user_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params: Record<string, unknown> = { p_country_code: 'ES' };
      if (days !== null) params.p_days = days;
      const { data: result, error } = await supabase.rpc(
        'admin_get_user_distribution_by_postcode',
        params as { p_country_code: string; p_days?: number },
      );
      if (error) logger.error('distribution_by_postcode', error);
      else setData((result as { province_code: string; user_count: number }[]) || []);
      setLoading(false);
    }
    void load();
  }, [supabase, days]);

  const maxCount = useMemo(() => Math.max(...data.map(d => d.user_count), 1), [data]);
  const totalUsers = useMemo(() => data.reduce((s, d) => s + d.user_count, 0), [data]);

  const dots = useMemo(() => {
    return data
      .filter(d => PROVINCE_COORDS[d.province_code])
      .map(d => {
        const c = PROVINCE_COORDS[d.province_code];
        const [x, y] = proj(c.lat, c.lng, d.province_code);
        const ratio = Math.sqrt(d.user_count) / Math.sqrt(maxCount);
        const r = 4 + ratio * 18;
        return { ...d, name: c.name, x, y, r };
      })
      .sort((a, b) => b.user_count - a.user_count);
  }, [data, maxCount]);

  // Comunidad Autónoma aggregation
  const ccaaRows = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(d => {
      const ccaa = PROVINCE_TO_CCAA[d.province_code];
      if (ccaa) map.set(ccaa, (map.get(ccaa) || 0) + d.user_count);
    });
    return Array.from(map.entries())
      .map(([code, count]) => ({ code, name: CCAA_NAMES[code] || code, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center text-gray-500 py-8">No postcode data for this period</div>;
  }

  const mainlandPath = polyPath(MAINLAND);
  const mallorcaPath = polyPath(MALLORCA);
  const ibizaPath = polyPath(IBIZA);
  const tenerifePath = polyPath(TENERIFE);
  const granCanariaPath = polyPath(GRAN_CANARIA);

  return (
    <div className="space-y-6">
      {/* ── Map ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-400">
            {totalUsers} users across {data.length} provinces
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg width="8" height="8"><circle cx="4" cy="4" r="3" fill="#f59e0b" opacity="0.7" /></svg>1-5
            </span>
            <span className="flex items-center gap-1">
              <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="#f59e0b" opacity="0.7" /></svg>10+
            </span>
            <span className="flex items-center gap-1">
              <svg width="22" height="22"><circle cx="11" cy="11" r="10" fill="#f59e0b" opacity="0.7" /></svg>50+
            </span>
          </div>
        </div>

        <div className="relative bg-[#1a2332] rounded-lg border border-gray-700/50 p-2 overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H + 50}`} className="w-full h-auto" style={{ maxHeight: '520px' }}>
            {/* Spain mainland */}
            <path d={mainlandPath} fill="#2a3a4e" stroke="#4a6078" strokeWidth="1.2" />
            {/* Balearic Islands */}
            <path d={mallorcaPath} fill="#2a3a4e" stroke="#4a6078" strokeWidth="1" />
            <path d={ibizaPath} fill="#2a3a4e" stroke="#4a6078" strokeWidth="1" />

            {/* Canary Islands inset */}
            <rect x={CANARY_OFF.x - 15} y={CANARY_OFF.y - 18} width={160} height={85}
              fill="none" stroke="#4a6078" strokeWidth="0.8" strokeDasharray="4,3" rx="4" />
            <text x={CANARY_OFF.x - 10} y={CANARY_OFF.y - 5}
              fill="#6B7280" fontSize="8" fontFamily="sans-serif">Canarias</text>
            <path d={tenerifePath} fill="#2a3a4e" stroke="#4a6078" strokeWidth="1" />
            <path d={granCanariaPath} fill="#2a3a4e" stroke="#4a6078" strokeWidth="1" />

            {/* Province dots */}
            {[...dots].reverse().map(dot => (
              <g key={dot.province_code}
                onMouseEnter={() => setHoveredProvince(dot.province_code)}
                onMouseLeave={() => setHoveredProvince(null)}
                className="cursor-pointer">
                <circle cx={dot.x} cy={dot.y} r={dot.r + 2}
                  fill="#f59e0b" opacity={hoveredProvince === dot.province_code ? 0.3 : 0.08}
                  className="transition-opacity duration-200" />
                <circle cx={dot.x} cy={dot.y} r={dot.r}
                  fill="#f59e0b"
                  opacity={hoveredProvince === dot.province_code ? 0.95 : 0.75}
                  stroke={hoveredProvince === dot.province_code ? '#fbbf24' : 'none'}
                  strokeWidth="2" className="transition-all duration-200" />
                {dot.r >= 8 && (
                  <text x={dot.x} y={dot.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="#000" fontSize={dot.r >= 14 ? '10' : '7'} fontWeight="bold"
                    fontFamily="sans-serif" pointerEvents="none">
                    {dot.user_count}
                  </text>
                )}
              </g>
            ))}

            {/* Tooltip */}
            {hoveredProvince && (() => {
              const dot = dots.find(d => d.province_code === hoveredProvince);
              if (!dot) return null;
              const tw = 120;
              const tx = Math.min(Math.max(dot.x - tw / 2, 5), W - tw - 5);
              const ty = dot.y - dot.r - 35;
              return (
                <g>
                  <rect x={tx} y={ty} width={tw} height={28} rx="4"
                    fill="#111827" stroke="#374151" strokeWidth="1" />
                  <text x={tx + tw / 2} y={ty + 11} textAnchor="middle"
                    fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                    {dot.name} ({dot.province_code})
                  </text>
                  <text x={tx + tw / 2} y={ty + 22} textAnchor="middle"
                    fill="#D1D5DB" fontSize="9" fontFamily="sans-serif">
                    {dot.user_count} user{dot.user_count !== 1 ? 's' : ''}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* ── CCAA Table (separate, after the map) ───────────────── */}
      {ccaaRows.length > 0 && (
        <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <h4 className="text-sm font-semibold text-white">
              Usuarios por Comunidad Autónoma
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700/30">
                  <th className="text-left px-4 py-2 font-medium">Comunidad</th>
                  <th className="text-right px-4 py-2 font-medium">Usuarios</th>
                  <th className="text-right px-4 py-2 font-medium">%</th>
                  <th className="px-4 py-2 font-medium" style={{ width: '40%' }}></th>
                </tr>
              </thead>
              <tbody>
                {ccaaRows.map(row => {
                  const pct = totalUsers > 0 ? (row.count / totalUsers) * 100 : 0;
                  return (
                    <tr key={row.code} className="border-b border-gray-700/20 hover:bg-gray-700/20 transition-colors">
                      <td className="px-4 py-2 text-gray-200 font-medium">{row.name}</td>
                      <td className="px-4 py-2 text-right text-amber-400 font-semibold tabular-nums">
                        {row.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400 tabular-nums">
                        {pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2">
                        <div className="w-full bg-gray-700/40 rounded-full h-2">
                          <div className="bg-amber-500/70 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-600/50">
                  <td className="px-4 py-2 text-white font-bold">Total</td>
                  <td className="px-4 py-2 text-right text-amber-400 font-bold tabular-nums">
                    {totalUsers.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-400 font-bold">100%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
