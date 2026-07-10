'use client';

import { useState, useMemo } from 'react';
import {
  useAdminStatistics,
  TIME_PERIODS,
  getTodaySince,
  type TimePeriodKey,
  type WeekCount,
  type DayMessages,
} from '@/hooks/admin/useAdminStatistics';
import { useTranslations } from 'next-intl';
import {
  Users,
  MessageSquare,
  LayoutGrid,
  TrendingUp,
  Globe,
  RefreshCw,
  Info,
  Heart,
  ShieldCheck,
  Handshake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/* ─── Province → Comunidad Autónoma mapping (from former SpainUserMap) ── */
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

/* ─── Country flag helper ─────────────────────────────────────────── */
function countryFlag(code: string) {
  const offset = 0x1f1e6;
  const A = 'A'.charCodeAt(0);
  return String.fromCodePoint(
    code.charCodeAt(0) - A + offset,
    code.charCodeAt(1) - A + offset,
  );
}

/* ─── Tooltip hint icon ───────────────────────────────────────────── */
function HintIcon({ text }: { text: string }) {
  return (
    <span className="relative group ml-1.5 inline-flex items-center">
      <Info className="h-3.5 w-3.5 text-gray-500 cursor-help shrink-0" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        hidden group-hover:block bg-gray-900 text-gray-200 text-xs rounded-lg
        px-3 py-2 w-60 text-center shadow-xl border border-gray-700 z-50 leading-relaxed">
        {text}
      </span>
    </span>
  );
}

/* ─── Stat card ───────────────────────────────────────────────────── */
type StatCardColor = 'gold' | 'blue' | 'green' | 'purple' | 'red' | 'teal';

const COLOR_MAP: Record<StatCardColor, string> = {
  gold:   'border-amber-500/30 bg-amber-500/5',
  blue:   'border-blue-500/30 bg-blue-500/5',
  green:  'border-green-500/30 bg-green-500/5',
  purple: 'border-purple-500/30 bg-purple-500/5',
  red:    'border-red-500/30 bg-red-500/5',
  teal:   'border-teal-500/30 bg-teal-500/5',
};

function StatCard({
  icon,
  label,
  hint,
  value,
  sub,
  color = 'gold',
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: string | number;
  sub?: string;
  color?: StatCardColor;
}) {
  return (
    <div className={`rounded-xl border-2 ${COLOR_MAP[color]} p-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-1.5 text-gray-400 text-sm">
        {icon}
        <span>{label}</span>
        <HintIcon text={hint} />
      </div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

/* ─── Section header ──────────────────────────────────────────────── */
function SectionHeader({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      {icon}
      {label}
      {hint && <HintIcon text={hint} />}
    </h3>
  );
}

/* ─── Retention badge ─────────────────────────────────────────────── */
function RetentionValue({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-500 text-2xl font-black">—</span>;
  const color = value >= 50 ? 'text-green-400' : value >= 25 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-2xl font-black ${color}`}>{value}%</span>;
}

/* ─── Chart tooltip style ─────────────────────────────────────────── */
const CHART_TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#1a2236', border: '1px solid #374151', borderRadius: '8px' },
  itemStyle: { color: '#e5e7eb' },
  labelStyle: { color: '#9ca3af', marginBottom: 4 },
};

/* ─── Date formatter for charts ───────────────────────────────────── */
function fmtDay(d: string) {
  const date = new Date(d + 'T12:00:00Z');
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
function fmtWeek(d: string) {
  const date = new Date(d + 'T12:00:00Z');
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/* ─── Known countries ─────────────────────────────────────────────── */
const KNOWN_COUNTRIES = ['ES', 'AR', 'MX', 'CO', 'PT', 'BR', 'CL', 'PE', 'UY'];

/* ─── Main component ──────────────────────────────────────────────── */
export default function StatisticsTab() {
  const t = useTranslations('admin.statistics');
  const [period, setPeriod] = useState<TimePeriodKey>('1w');
  const [country, setCountry] = useState<string>('ALL');

  const countryCode = country === 'ALL' ? null : country;

  const { data, loading, error, refetch } = useAdminStatistics(period, countryCode);

  /* ── Spain CCAA aggregation ─────────────────────────────────────── */
  const ccaaRows = useMemo(() => {
    if (!data.spainCCAA.length) return [];
    const map = new Map<string, number>();
    data.spainCCAA.forEach(d => {
      const ccaa = PROVINCE_TO_CCAA[d.province_code];
      if (ccaa) map.set(ccaa, (map.get(ccaa) ?? 0) + Number(d.user_count));
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .map(([code, count]) => ({
        code,
        name: CCAA_NAMES[code] ?? code,
        count,
        pct: total > 0 ? ((count / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [data.spainCCAA]);

  /* ── Chart data helpers ─────────────────────────────────────────── */
  const dailyUsersChartData = data.newUsersDaily.map(d => ({
    day: fmtDay(d.day as string),
    value: Number(d.user_count ?? 0),
  }));

  const dailyListingsChartData = data.dailyListings.map(d => ({
    day: fmtDay(d.day as string),
    value: Number(d.listing_count ?? 0),
  }));

  const dailyMessagesChartData = (data.dailyMessages as DayMessages[]).map(d => ({
    day: fmtDay(d.day as string),
    match: Number(d.match_messages ?? 0),
    marketplace: Number(d.marketplace_messages ?? 0),
    total: Number(d.total_messages ?? 0),
  }));

  const weeklyUsersTableData = (data.newUsersWeekly as WeekCount[]).slice(-12).reverse();

  const ov = data.overview;
  const pt = data.periodTotals;

  return (
    <div className="space-y-8">
      {/* ── Controls ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <h2 className="text-2xl font-black text-white">{t('title')}</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time period */}
          <div className="flex bg-[#2D3748] rounded-lg border-2 border-black overflow-hidden">
            {TIME_PERIODS.map(tp => (
              <button
                key={tp.key}
                onClick={() => setPeriod(tp.key)}
                className={`px-3 py-1.5 text-sm font-bold transition-colors ${
                  period === tp.key
                    ? 'bg-gold text-black'
                    : 'text-gray-300 hover:text-white hover:bg-[#374151]'
                }`}
              >
                {t(`period_${tp.key}`)}
              </button>
            ))}
          </div>

          {/* Country filter */}
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            <select
              className="bg-[#2D3748] text-white border-2 border-black rounded-md px-2 py-1.5 text-sm"
              value={country}
              onChange={e => setCountry(e.target.value)}
            >
              <option value="ALL">{t('allCountries')}</option>
              {KNOWN_COUNTRIES.map(c => (
                <option key={c} value={c}>
                  {countryFlag(c)} {c}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-900/20 border-2 border-red-600 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
        </div>
      )}

      {!loading && (
        <>
          {/* ═══════════════════════════════════════════════════════ */}
          {/* § 1 — Overview KPIs (always absolute, no period filter) */}
          {/* ═══════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              icon={<TrendingUp className="h-5 w-5 text-amber-400" />}
              label={t('overviewSection')}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label={t('totalRegistered')}
                hint={t('totalRegistered_hint')}
                value={(ov?.total_registered ?? 0).toLocaleString()}
                color="gold"
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label={t('mau')}
                hint={t('mau_hint')}
                value={(ov?.mau ?? 0).toLocaleString()}
                color="blue"
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label={t('wau')}
                hint={t('wau_hint')}
                value={(ov?.wau ?? 0).toLocaleString()}
                color="blue"
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label={t('dau')}
                hint={t('dau_hint')}
                value={(ov?.dau ?? 0).toLocaleString()}
                color="teal"
              />
              <StatCard
                icon={<LayoutGrid className="h-4 w-4" />}
                label={t('activeListings')}
                hint={t('activeListings_hint')}
                value={(ov?.active_listings ?? 0).toLocaleString()}
                color="green"
              />
              <div className={`rounded-xl border-2 ${COLOR_MAP.purple} p-4 flex flex-col gap-1`}>
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t('retention30')}</span>
                  <HintIcon text={t('retention30_hint')} />
                </div>
                <RetentionValue value={ov?.retention_30d ?? null} />
              </div>
              <div className={`rounded-xl border-2 ${COLOR_MAP.purple} p-4 flex flex-col gap-1`}>
                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t('retention90')}</span>
                  <HintIcon text={t('retention90_hint')} />
                </div>
                <RetentionValue value={ov?.retention_90d ?? null} />
              </div>
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* § 2 — New Users                                        */}
          {/* ═══════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              icon={<Users className="h-5 w-5 text-amber-400" />}
              label={t('newUsersSection')}
            />

            {/* Period total */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label={t('newUsersInPeriod')}
                hint={t('newUsersInPeriod_hint')}
                value={(pt?.new_users ?? 0).toLocaleString()}
                color="gold"
              />
            </div>

            {/* Daily bar chart */}
            <div className="bg-[#1a2236] rounded-xl border-2 border-gray-800 p-4 mb-6">
              <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-4">
                <span className="font-semibold text-gray-300">{t('newUsersDaily')}</span>
                <HintIcon text={t('newUsersDaily_hint')} />
              </div>
              {dailyUsersChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyUsersChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number | undefined) => [(v ?? 0).toLocaleString(), t('newUsersInPeriod')]} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8 text-sm">{t('noData')}</p>
              )}
            </div>

            {/* Weekly summary table */}
            <div className="bg-[#1a2236] rounded-xl border-2 border-gray-800 p-4">
              <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-4">
                <span className="font-semibold text-gray-300">{t('newUsersWeekly')}</span>
                <HintIcon text={t('newUsersWeekly_hint')} />
              </div>
              {weeklyUsersTableData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-white">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-700">
                        <th className="text-left pb-2 font-medium">{t('colWeek')}</th>
                        <th className="text-right pb-2 font-medium">{t('colCount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyUsersTableData.map((w: WeekCount) => (
                        <tr key={w.week_start} className="border-b border-gray-800/50">
                          <td className="py-1.5 text-gray-300">{fmtWeek(w.week_start)}</td>
                          <td className="py-1.5 text-right font-bold">{Number(w.user_count).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm">{t('noData')}</p>
              )}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* § 3 — Listings                                         */}
          {/* ═══════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              icon={<LayoutGrid className="h-5 w-5 text-green-400" />}
              label={t('listingsSection')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={<LayoutGrid className="h-4 w-4" />}
                label={t('activeListings')}
                hint={t('activeListings_hint')}
                value={(ov?.active_listings ?? 0).toLocaleString()}
                color="green"
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4" />}
                label={t('publishedInPeriod')}
                hint={t('publishedInPeriod_hint')}
                value={(pt?.new_listings ?? 0).toLocaleString()}
                color="teal"
              />
            </div>

            {/* Daily listings bar chart */}
            <div className="bg-[#1a2236] rounded-xl border-2 border-gray-800 p-4">
              <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-4">
                <span className="font-semibold text-gray-300">{t('dailyListings')}</span>
                <HintIcon text={t('dailyListings_hint')} />
              </div>
              {dailyListingsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyListingsChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: number | undefined) => [(v ?? 0).toLocaleString(), t('publishedInPeriod')]} />
                    <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8 text-sm">{t('noData')}</p>
              )}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* § 4 — Messaging                                        */}
          {/* ═══════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
              label={t('messagingSection')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={<MessageSquare className="h-4 w-4" />}
                label={t('totalMessagesInPeriod')}
                hint={t('totalMessagesInPeriod_hint')}
                value={(pt?.total_messages ?? 0).toLocaleString()}
                color="blue"
              />
            </div>

            {/* Stacked area chart */}
            <div className="bg-[#1a2236] rounded-xl border-2 border-gray-800 p-4">
              <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-4">
                <span className="font-semibold text-gray-300">{t('dailyMessages')}</span>
                <HintIcon text={t('dailyMessages_hint')} />
              </div>
              {dailyMessagesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyMessagesChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradMatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradMarket" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      {...CHART_TOOLTIP_STYLE}
                      formatter={(v: number | undefined, name: string | undefined) => [
                        (v ?? 0).toLocaleString(),
                        name === 'match' ? t('matchMessages') : t('marketplaceMessages'),
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'match' ? t('matchMessages') : t('marketplaceMessages')
                      }
                      wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                    />
                    <Area type="monotone" dataKey="match" stroke="#8b5cf6" fill="url(#gradMatch)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="marketplace" stroke="#3b82f6" fill="url(#gradMarket)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8 text-sm">{t('noData')}</p>
              )}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* § 5 — Matches & Exchanges                              */}
          {/* ═══════════════════════════════════════════════════════ */}
          <section>
            <SectionHeader
              icon={<Heart className="h-5 w-5 text-pink-400" />}
              label={t('matchesExchangesSection')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                icon={<Heart className="h-4 w-4" />}
                label={t('matchesGenerated')}
                hint={t('matchesGenerated_hint')}
                value={(pt?.matches_generated ?? 0).toLocaleString()}
                color="purple"
              />
              <StatCard
                icon={<Handshake className="h-4 w-4" />}
                label={t('exchangesCompleted')}
                hint={t('exchangesCompleted_hint')}
                value={(pt?.exchanges_completed ?? 0).toLocaleString()}
                color="green"
              />
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* § 6 — Spain CCAA (only when country = ES)              */}
          {/* ═══════════════════════════════════════════════════════ */}
          {country === 'ES' && (
            <section>
              <SectionHeader
                icon={<Globe className="h-5 w-5 text-amber-400" />}
                label={t('spainCCAASection')}
                hint={t('spainCCAA_hint')}
              />
              {ccaaRows.length > 0 ? (
                <div className="bg-[#1a2236] rounded-xl border-2 border-gray-800 overflow-hidden">
                  <table className="min-w-full text-sm text-white">
                    <thead>
                      <tr className="bg-gray-800/50 text-gray-400">
                        <th className="text-left px-4 py-3 font-medium">{t('colCCAA')}</th>
                        <th className="text-right px-4 py-3 font-medium">{t('colUsers')}</th>
                        <th className="text-right px-4 py-3 font-medium">{t('colPercent')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ccaaRows.map((row, i) => (
                        <tr
                          key={row.code}
                          className={i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}
                        >
                          <td className="px-4 py-2.5 text-gray-200 font-medium">{row.name}</td>
                          <td className="px-4 py-2.5 text-right font-bold">{row.count.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-gray-400">{row.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8 text-sm">{t('noData')}</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
