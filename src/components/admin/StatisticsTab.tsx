'use client';

import { useState, useMemo, lazy, Suspense } from 'react';
import { useAdminStatistics, TIME_PERIODS, type TimePeriodKey } from '@/hooks/admin/useAdminStatistics';
import { useTranslations } from 'next-intl';
import { Users, MessageSquare, ShoppingCart, TrendingUp, Globe, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SpainUserMap = lazy(() => import('@/components/admin/SpainUserMap'));

/* ─── Country flag helper ──────────────────────────────────────────── */
function countryFlag(code: string) {
  const offset = 0x1f1e6;
  const A = 'A'.charCodeAt(0);
  return String.fromCodePoint(
    code.charCodeAt(0) - A + offset,
    code.charCodeAt(1) - A + offset,
  );
}

/* ─── Stat card helper ─────────────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  sub,
  color = 'gold',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    gold: 'border-amber-500/30 bg-amber-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
  };
  return (
    <div className={`rounded-lg border-2 ${colorMap[color] ?? colorMap.gold} p-4`}>
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────── */
export default function StatisticsTab() {
  const t = useTranslations('admin.statistics');
  const [period, setPeriod] = useState<TimePeriodKey>('1w');
  const [country, setCountry] = useState<string>('ALL');

  const { data, loading, error, refetch } = useAdminStatistics(period);

  // Derive unique country list from all data sources
  const countries = useMemo(() => {
    const set = new Set<string>();
    data.newUsers.forEach(u => set.add(u.country_code));
    data.messagingByCountry.forEach(m => set.add(m.country_code));
    data.listingsByCountry.forEach(l => set.add(l.country_code));
    return Array.from(set).sort();
  }, [data]);

  // ── Filtered / aggregated metrics ──────────────────────────────
  const filteredUsers = useMemo(() => {
    if (country === 'ALL') return data.newUsers;
    return data.newUsers.filter(u => u.country_code === country);
  }, [data.newUsers, country]);

  const messagingMetrics = useMemo(() => {
    if (country === 'ALL') {
      return data.messagingSummary
        ? {
            totalMessages: data.messagingSummary.total_messages,
            uniqueSenders: data.messagingSummary.unique_senders,
            uniqueConversations: data.messagingSummary.unique_conversations,
            messagesPerDay: data.messagingSummary.messages_per_day,
          }
        : { totalMessages: 0, uniqueSenders: 0, uniqueConversations: 0, messagesPerDay: 0 };
    }
    const row = data.messagingByCountry.find(m => m.country_code === country);
    return {
      totalMessages: row?.total_messages ?? 0,
      uniqueSenders: row?.unique_senders ?? 0,
      uniqueConversations: row?.unique_conversations ?? 0,
      messagesPerDay: 0,
    };
  }, [data.messagingSummary, data.messagingByCountry, country]);

  const listingsMetrics = useMemo(() => {
    if (country === 'ALL') {
      return {
        total: data.listingsByCountry.reduce((sum, l) => sum + l.total_listings, 0),
        byCountry: data.listingsByCountry,
      };
    }
    const row = data.listingsByCountry.find(l => l.country_code === country);
    return {
      total: row?.total_listings ?? 0,
      byCountry: row ? [row] : [],
    };
  }, [data.listingsByCountry, country]);

  const statusMetrics = useMemo(() => {
    // Listing status stats are global (not per-country) so always show all
    return data.listingStatusStats;
  }, [data.listingStatusStats]);

  const statusTotal = statusMetrics.reduce((s, r) => s + r.total, 0);

  // ── Status label + color helpers ──────────────────────────────
  const statusColors: Record<string, string> = {
    active: 'bg-green-600',
    reserved: 'bg-amber-600',
    removed: 'bg-red-600',
    suspended: 'bg-gray-600',
    sold: 'bg-blue-600',
    completed: 'bg-blue-600',
    cancelled: 'bg-gray-500',
  };

  return (
    <div className="space-y-6">
      {/* ── Controls ──────────────────────────────────────────── */}
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
              {countries.map(c => (
                <option key={c} value={c}>
                  {countryFlag(c)} {c}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-900/20 border-2 border-red-600 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── 1. Users ───────────────────────────────────────── */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              {t('usersSection')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label={t('newUsers')}
                value={filteredUsers.length}
                color="gold"
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4" />}
                label={t('withListings')}
                value={filteredUsers.filter(u => u.listings_count > 0).length}
                color="green"
              />
              <StatCard
                icon={<MessageSquare className="h-4 w-4" />}
                label={t('withMessages')}
                value={filteredUsers.filter(u => u.chat_messages_count > 0).length}
                color="blue"
              />
            </div>

            {/* Recent signups table */}
            {filteredUsers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm bg-[#2D3748] text-white border-2 border-black rounded-md">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="px-3 py-2 text-left border-b border-black">{t('colNickname')}</th>
                      <th className="px-3 py-2 text-left border-b border-black">{t('colEmail')}</th>
                      <th className="px-3 py-2 text-left border-b border-black">{t('colCountry')}</th>
                      <th className="px-3 py-2 text-left border-b border-black">{t('colJoined')}</th>
                      <th className="px-3 py-2 text-right border-b border-black">{t('colListings')}</th>
                      <th className="px-3 py-2 text-right border-b border-black">{t('colMessages')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.slice(0, 25).map(u => (
                      <tr key={u.user_id} className="odd:bg-[#2D3748] even:bg-[#253044]">
                        <td className="px-3 py-1.5 border-b border-black font-medium">{u.nickname}</td>
                        <td className="px-3 py-1.5 border-b border-black text-gray-400">{u.email}</td>
                        <td className="px-3 py-1.5 border-b border-black">
                          {countryFlag(u.country_code)} {u.country_code}
                        </td>
                        <td className="px-3 py-1.5 border-b border-black whitespace-nowrap text-gray-300">
                          {new Date(u.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 border-b border-black text-right">{u.listings_count}</td>
                        <td className="px-3 py-1.5 border-b border-black text-right">{u.chat_messages_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length > 25 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('showingFirst', { count: 25, total: filteredUsers.length })}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── 1b. Spain User Map ──────────────────────────────── */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-400" />
              {t('spainMap')}
            </h3>
            <Suspense fallback={
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-gold border-r-transparent rounded-full" />
              </div>
            }>
              <SpainUserMap />
            </Suspense>
          </section>

          {/* ── 2. Messaging ───────────────────────────────────── */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              {t('messagingSection')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<MessageSquare className="h-4 w-4" />}
                label={t('totalMessages')}
                value={messagingMetrics.totalMessages.toLocaleString()}
                color="blue"
              />
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label={t('uniqueSenders')}
                value={messagingMetrics.uniqueSenders}
                color="blue"
              />
              <StatCard
                icon={<MessageSquare className="h-4 w-4" />}
                label={t('uniqueConversations')}
                value={messagingMetrics.uniqueConversations}
                color="purple"
              />
              {country === 'ALL' && messagingMetrics.messagesPerDay > 0 && (
                <StatCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label={t('messagesPerDay')}
                  value={Math.round(messagingMetrics.messagesPerDay)}
                  color="green"
                />
              )}
            </div>

            {/* Country breakdown */}
            {country === 'ALL' && data.messagingByCountry.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm bg-[#2D3748] text-white border-2 border-black rounded-md">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="px-3 py-2 text-left border-b border-black">{t('colCountry')}</th>
                      <th className="px-3 py-2 text-right border-b border-black">{t('totalMessages')}</th>
                      <th className="px-3 py-2 text-right border-b border-black">{t('uniqueSenders')}</th>
                      <th className="px-3 py-2 text-right border-b border-black">{t('uniqueConversations')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.messagingByCountry.map(m => (
                      <tr key={m.country_code} className="odd:bg-[#2D3748] even:bg-[#253044]">
                        <td className="px-3 py-1.5 border-b border-black font-medium">
                          {countryFlag(m.country_code)} {m.country_code}
                        </td>
                        <td className="px-3 py-1.5 border-b border-black text-right">{m.total_messages.toLocaleString()}</td>
                        <td className="px-3 py-1.5 border-b border-black text-right">{m.unique_senders}</td>
                        <td className="px-3 py-1.5 border-b border-black text-right">{m.unique_conversations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── 3. Listing Status (Transactions) ───────────────── */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-400" />
              {t('transactionsSection')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                icon={<ShoppingCart className="h-4 w-4" />}
                label={t('totalListings')}
                value={statusTotal}
                color="gold"
              />
              {statusMetrics.map(s => (
                <div
                  key={s.status}
                  className="rounded-lg border-2 border-gray-700/50 bg-gray-800/30 p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColors[s.status] ?? 'bg-gray-500'}`} />
                    <span className="text-gray-400 text-sm capitalize">{s.status}</span>
                  </div>
                  <p className="text-2xl font-black text-white">{s.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {statusTotal > 0 ? ((s.total / statusTotal) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 4. New Listings ─────────────────────────────────── */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              {t('listingsSection')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                icon={<ShoppingCart className="h-4 w-4" />}
                label={t('newListings')}
                value={listingsMetrics.total}
                color="purple"
              />
            </div>

            {/* Country breakdown */}
            {country === 'ALL' && listingsMetrics.byCountry.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm bg-[#2D3748] text-white border-2 border-black rounded-md">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="px-3 py-2 text-left border-b border-black">{t('colCountry')}</th>
                      <th className="px-3 py-2 text-right border-b border-black">{t('newListings')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listingsMetrics.byCountry.map(l => (
                      <tr key={l.country_code} className="odd:bg-[#2D3748] even:bg-[#253044]">
                        <td className="px-3 py-1.5 border-b border-black font-medium">
                          {countryFlag(l.country_code)} {l.country_code}
                        </td>
                        <td className="px-3 py-1.5 border-b border-black text-right">{l.total_listings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
