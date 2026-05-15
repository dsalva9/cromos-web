'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { logger } from '@/lib/logger';

/* ─── Province center coordinates (lat, lng) ───────────────────────── */
// Spanish postal codes: first 2 digits = province code
// Coordinates are approximate province capitals / centers
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

/* ─── Geo projection (simple Mercator-like for Spain) ──────────────── */
// Bounding box: lat [35.0, 44.0], lng [-9.5, 4.5]
// We map to a viewBox of ~600x500
const MAP_BOUNDS = {
  latMin: 35.0,
  latMax: 44.0,
  lngMin: -9.5,
  lngMax: 4.5,
};

// Canary Islands inset box (bottom-left)
const CANARY_OFFSET = { x: 80, y: 400 };
const CANARY_CODES = ['35', '38'];

function projectToSVG(lat: number, lng: number, code: string): { x: number; y: number } {
  const { latMin, latMax, lngMin, lngMax } = MAP_BOUNDS;
  const width = 560;
  const height = 420;
  const padding = 20;

  // Handle Canary Islands separately
  if (CANARY_CODES.includes(code)) {
    // Canary Islands relative positioning within the inset
    const canaryLngMin = -18.5;
    const canaryLngMax = -13.0;
    const canaryLatMin = 27.5;
    const canaryLatMax = 29.5;
    const insetWidth = 120;
    const insetHeight = 55;

    const x = CANARY_OFFSET.x + ((lng - canaryLngMin) / (canaryLngMax - canaryLngMin)) * insetWidth;
    const y = CANARY_OFFSET.y + ((canaryLatMax - lat) / (canaryLatMax - canaryLatMin)) * insetHeight;
    return { x, y };
  }

  const x = padding + ((lng - lngMin) / (lngMax - lngMin)) * width;
  const y = padding + ((latMax - lat) / (latMax - latMin)) * height;
  return { x, y };
}

/* ─── Spain outline path (simplified) ──────────────────────────────── */
const SPAIN_OUTLINE = `M 108,42 L 130,30 155,22 180,25 210,20 240,28 270,25 300,22
  330,26 355,28 380,30 405,25 430,30 455,38 478,50 495,65 510,85
  518,105 525,130 530,155 535,175 540,195 535,215 525,235 518,258
  510,278 498,298 485,315 470,328 455,338 435,348 415,355 395,358
  375,362 355,370 335,378 315,385 295,388 275,385 255,378 240,372
  225,365 210,358 195,355 178,358 160,362 142,368 125,372 108,375
  92,370 78,362 65,352 55,340 48,325 42,308 38,290 35,270
  32,250 30,230 30,210 32,190 35,170 38,150 42,130 48,112
  55,95 65,78 78,62 92,48 108,42Z`;

/* ─── Main component ───────────────────────────────────────────────── */
export default function SpainUserMap() {
  const supabase = useSupabaseClient();
  const [data, setData] = useState<{ province_code: string; user_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data: result, error } = await supabase.rpc('admin_get_user_distribution_by_postcode', {
        p_country_code: 'ES',
      });
      if (error) {
        logger.error('admin_get_user_distribution_by_postcode error', error);
      } else {
        setData((result as { province_code: string; user_count: number }[]) || []);
      }
      setLoading(false);
    }
    void fetch();
  }, [supabase]);

  // Max user count for scaling
  const maxCount = useMemo(() => Math.max(...data.map(d => d.user_count), 1), [data]);
  const totalUsers = useMemo(() => data.reduce((s, d) => s + d.user_count, 0), [data]);

  // Build dots with positions
  const dots = useMemo(() => {
    return data
      .filter(d => PROVINCE_COORDS[d.province_code])
      .map(d => {
        const coords = PROVINCE_COORDS[d.province_code];
        const pos = projectToSVG(coords.lat, coords.lng, d.province_code);
        // Scale radius: min 4, max 22, proportional to sqrt of count
        const minR = 4;
        const maxR = 22;
        const ratio = Math.sqrt(d.user_count) / Math.sqrt(maxCount);
        const r = minR + ratio * (maxR - minR);
        return {
          ...d,
          ...coords,
          ...pos,
          r,
        };
      })
      .sort((a, b) => b.user_count - a.user_count); // Render larger dots first (behind smaller)
  }, [data, maxCount]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No postcode data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {totalUsers} users with postcode data across {data.length} provinces
        </p>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <svg width="8" height="8"><circle cx="4" cy="4" r="3" fill="#f59e0b" opacity="0.7" /></svg>
            <span>1-5</span>
          </div>
          <div className="flex items-center gap-1">
            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="#f59e0b" opacity="0.7" /></svg>
            <span>10+</span>
          </div>
          <div className="flex items-center gap-1">
            <svg width="22" height="22"><circle cx="11" cy="11" r="10" fill="#f59e0b" opacity="0.7" /></svg>
            <span>50+</span>
          </div>
        </div>
      </div>

      <div className="relative bg-[#1a2332] rounded-lg border-2 border-gray-700/50 p-2 overflow-hidden">
        <svg
          viewBox="0 0 600 470"
          className="w-full h-auto"
          style={{ maxHeight: '500px' }}
        >
          {/* Spain outline */}
          <path
            d={SPAIN_OUTLINE}
            fill="#2D3748"
            stroke="#4A5568"
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Canary Islands inset box */}
          <rect
            x={CANARY_OFFSET.x - 10}
            y={CANARY_OFFSET.y - 15}
            width={140}
            height={75}
            fill="none"
            stroke="#4A5568"
            strokeWidth="1"
            strokeDasharray="4,3"
            rx="4"
          />
          <text
            x={CANARY_OFFSET.x - 5}
            y={CANARY_OFFSET.y - 3}
            fill="#6B7280"
            fontSize="8"
            fontFamily="sans-serif"
          >
            Canarias
          </text>

          {/* Province dots - render smallest on top */}
          {[...dots].reverse().map(dot => (
            <g
              key={dot.province_code}
              onMouseEnter={() => setHoveredProvince(dot.province_code)}
              onMouseLeave={() => setHoveredProvince(null)}
              className="cursor-pointer"
            >
              {/* Glow effect */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={dot.r + 2}
                fill="#f59e0b"
                opacity={hoveredProvince === dot.province_code ? 0.3 : 0.1}
                className="transition-opacity duration-200"
              />
              {/* Main dot */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={dot.r}
                fill="#f59e0b"
                opacity={hoveredProvince === dot.province_code ? 0.95 : 0.7}
                stroke={hoveredProvince === dot.province_code ? '#fbbf24' : 'none'}
                strokeWidth="2"
                className="transition-all duration-200"
              />
              {/* Count label for larger dots */}
              {dot.r >= 8 && (
                <text
                  x={dot.x}
                  y={dot.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#000"
                  fontSize={dot.r >= 14 ? '10' : '8'}
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  pointerEvents="none"
                >
                  {dot.user_count}
                </text>
              )}
            </g>
          ))}

          {/* Tooltip */}
          {hoveredProvince && (() => {
            const dot = dots.find(d => d.province_code === hoveredProvince);
            if (!dot) return null;
            const tooltipWidth = 120;
            const tooltipX = Math.min(Math.max(dot.x - tooltipWidth / 2, 5), 600 - tooltipWidth - 5);
            const tooltipY = dot.y - dot.r - 35;
            return (
              <g>
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={28}
                  rx="4"
                  fill="#111827"
                  stroke="#374151"
                  strokeWidth="1"
                />
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 11}
                  textAnchor="middle"
                  fill="#f59e0b"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {dot.name} ({dot.province_code})
                </text>
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 22}
                  textAnchor="middle"
                  fill="#D1D5DB"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {dot.user_count} user{dot.user_count !== 1 ? 's' : ''}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
