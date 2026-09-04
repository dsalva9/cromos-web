'use client';

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Users, Clock, AlertTriangle, TrendingUp, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import AdminGuard from '@/components/AdminGuard';
import { useDebounce } from '@/hooks/useDebounce';
import { resolveAvatarUrl } from '@/lib/profile/resolveAvatarUrl';

function ProSubscribersTab() {
  const supabase = useSupabaseClient();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_get_pro_subscribers', {
        p_status: statusFilter === 'all' ? null : statusFilter,
        p_limit: 50,
        p_offset: (page - 1) * 50
      });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching subscribers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [statusFilter, page]);

  const handleExtend = async (userId: string) => {
    const days = prompt('How many days to extend? (e.g. 7, 30, 90)');
    if (!days || isNaN(Number(days))) return;

    try {
      const { error } = await (supabase.rpc as any)('admin_extend_pro', {
        p_user_id: userId,
        p_extra_days: Number(days)
      });
      if (error) throw error;
      toast.success(`Extended PRO for ${days} days`);
      fetchSubscribers();
    } catch (err: any) {
      toast.error(err.message || 'Error extending PRO');
    }
  };

  const handleRevoke = async (userId: string, nickname: string) => {
    if (!confirm(`Are you sure you want to revoke PRO from ${nickname}?`)) return;
    try {
      const { error } = await (supabase.rpc as any)('admin_revoke_pro', {
        p_user_id: userId,
        p_reason: 'Revoked by admin'
      });
      if (error) throw error;
      toast.success('Revoked PRO successfully');
      fetchSubscribers();
    } catch (err: any) {
      toast.error(err.message || 'Error revoking PRO');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trial': return <Badge className="bg-blue-600">Trial</Badge>;
      case 'active': return <Badge className="bg-green-600">Active</Badge>;
      case 'expired': return <Badge className="bg-gray-600">Expired</Badge>;
      case 'cancelled': return <Badge className="bg-red-600">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-[#374151] border-2 border-black text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ModernCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs uppercase bg-[#111827] text-gray-400">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Start Date</th>
                <th className="px-6 py-3">Expires</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">Loading...</td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">No subscribers found</td>
                </tr>
              ) : (
                subscribers.map((sub, i) => (
                  <tr key={i} className="border-b border-gray-700 bg-[#1F2937] hover:bg-[#374151]">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
                        {sub.avatar_url ? (
                          <Image src={resolveAvatarUrl(sub.avatar_url, supabase) || ''} alt={sub.nickname} width={32} height={32} />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <span className="font-medium text-white">{sub.nickname}</span>
                    </td>
                    <td className="px-6 py-4 capitalize">{sub.plan_type}</td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4">{new Date(sub.start_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{new Date(sub.expires_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <Button size="sm" className="bg-[#F59E0B] hover:bg-[#D97706] text-black" onClick={() => handleExtend(sub.user_id)}>
                        Extend
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRevoke(sub.user_id, sub.nickname)}>
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ModernCard>
      <div className="flex justify-between items-center mt-4">
        <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
          Previous
        </Button>
        <span className="text-gray-400">Page {page}</span>
        <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={subscribers.length < 50 || loading}>
          Next
        </Button>
      </div>
    </div>
  );
}

function GrantManualTab() {
  const supabase = useSupabaseClient();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  useEffect(() => {
    if (!debouncedQuery) {
      setUsers([]);
      return;
    }
    const searchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .ilike('nickname', `%${debouncedQuery}%`)
        .limit(10);
      if (data) setUsers(data);
    };
    searchUsers();
  }, [debouncedQuery, supabase]);

  const handleGrant = async () => {
    if (!selectedUser) return;
    setIsGranting(true);
    try {
      const { error } = await (supabase.rpc as any)('admin_grant_pro', {
        p_user_id: selectedUser.id,
        p_duration_days: Number(duration),
        p_reason: reason
      });
      if (error) throw error;
      toast.success(`Granted PRO to ${selectedUser.nickname}`);
      setSelectedUser(null);
      setQuery('');
      setReason('');
    } catch (err: any) {
      toast.error(err.message || 'Error granting PRO');
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <ModernCard>
        <ModernCardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-white">Search User</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by nickname..."
                className="pl-10 bg-[#374151] border-2 border-black text-white"
              />
            </div>
            {users.length > 0 && !selectedUser && (
              <div className="mt-2 bg-[#111827] border border-gray-700 rounded-md overflow-hidden">
                {users.map(u => (
                  <div 
                    key={u.id} 
                    className="p-3 hover:bg-[#374151] cursor-pointer flex items-center gap-3 border-b border-gray-700 last:border-0"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
                      {u.avatar_url ? (
                        <Image src={resolveAvatarUrl(u.avatar_url, supabase) || ''} alt={u.nickname} width={32} height={32} />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <span className="text-white">{u.nickname}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="space-y-6 p-4 border border-gray-700 rounded-lg bg-[#111827]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
                  {selectedUser.avatar_url ? (
                    <Image src={resolveAvatarUrl(selectedUser.avatar_url, supabase) || ''} alt={selectedUser.nickname} width={48} height={48} />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedUser.nickname}</h3>
                  <Button variant="link" className="h-auto p-0 text-gray-400 text-sm" onClick={() => setSelectedUser(null)}>Change user</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Duration</Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: '1 semana', value: '7' },
                    { label: '1 mes', value: '30' },
                    { label: '3 meses', value: '90' },
                    { label: '6 meses', value: '180' },
                    { label: '1 año', value: '365' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input 
                        type="radio" 
                        name="duration" 
                        value={opt.value} 
                        checked={duration === opt.value} 
                        onChange={e => setDuration(e.target.value)}
                        className="accent-gold"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Reason</Label>
                <Input 
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  placeholder="E.g. Giveaway winner, compensation..." 
                  className="bg-[#374151] border-2 border-black text-white"
                />
              </div>

              <Button 
                onClick={handleGrant} 
                disabled={isGranting || !reason}
                className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold"
              >
                Otorgar PRO
              </Button>
            </div>
          )}
        </ModernCardContent>
      </ModernCard>
    </div>
  );
}

function ConfigTab() {
  const supabase = useSupabaseClient();
  const [config, setConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      // Fetching everything from pro_config, fallback to hardcoded if table doesn't exist
      const { data, error } = await (supabase.from as any)('pro_config').select('*');
      if (error) {
        console.error(error);
        // Fallback for UI if table doesn't exist yet
        setConfig([
          { key: 'trial_duration_days', value: '7', description: 'Default trial days' },
          { key: 'daily_listing_limit_free', value: '10', description: 'Max listings for free users' },
          { key: 'extra_listing_rewarded_ads', value: '1', description: 'Listings per ad watched' },
          { key: 'highlight_credits_monthly', value: '5', description: 'Monthly highlight credits' }
        ]);
        return;
      }
      setConfig(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [supabase]);

  const handleSave = async (key: string, value: string) => {
    try {
      // Reconstruct the JSONB value with the updated number
      const configItem = config.find(c => c.key === key);
      let jsonValue: any;
      if (configItem?.value && typeof configItem.value === 'object') {
        const firstKey = Object.keys(configItem.value)[0];
        jsonValue = { ...configItem.value, [firstKey]: Number(value) };
      } else {
        jsonValue = { value: Number(value) };
      }
      const { error } = await (supabase.rpc as any)('admin_update_pro_config', {
        p_key: key,
        p_value: jsonValue
      });
      if (error) throw error;
      toast.success('Configuración guardada');
      fetchConfig();
    } catch (err: any) {
      toast.error(err.message || 'Error saving configuration');
    }
  };

  const getDisplayValue = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      const vals = Object.values(value);
      return String(vals[0] ?? '');
    }
    return String(value ?? '');
  };

  const getDisplayLabel = (key: string): string => {
    const labels: Record<string, string> = {
      highlight_credits_monthly: 'Créditos destacados mensuales',
      trial_duration_days: 'Días de prueba (default)',
      daily_listing_limit_free: 'Límite diario subidas (gratis)',
      extra_listing_rewarded_ads: 'Anuncios para subida extra',
      extra_listing_price_cents: 'Precio subida extra (céntimos)',
    };
    return labels[key] || key;
  };

  if (loading) return <div className="text-white">Cargando...</div>;

  return (
    <div className="space-y-4">
      {config.map((item) => (
        <ModernCard key={item.key}>
          <ModernCardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">{getDisplayLabel(item.key)}</h3>
              <p className="text-gray-400 text-sm font-mono">{item.key}</p>
              {typeof item.value === 'object' && Object.keys(item.value).length > 1 && (
                <p className="text-gray-500 text-xs mt-1">
                  {JSON.stringify(item.value)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                defaultValue={getDisplayValue(item.value)}
                id={`config-${item.key}`}
                className="w-24 bg-[#374151] border-2 border-black text-white"
              />
              <Button 
                onClick={() => {
                  const val = (document.getElementById(`config-${item.key}`) as HTMLInputElement).value;
                  handleSave(item.key, val);
                }}
                className="bg-[#F59E0B] hover:bg-[#D97706] text-black"
              >
                Guardar
              </Button>
            </div>
          </ModernCardContent>
        </ModernCard>
      ))}
    </div>
  );
}

function StatsTab() {
  const supabase = useSupabaseClient();
  const [stats, setStats] = useState({
    active_subscribers: 0,
    active_trials: 0,
    trials_expiring_week: 0,
    conversion_rate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await (supabase.rpc as any)('admin_get_pro_stats');
        if (error) {
          console.error(error);
          return;
        }
        if (data) {
          setStats({
            active_subscribers: data.active_subscribers || 0,
            active_trials: data.active_trials || 0,
            trials_expiring_week: data.trials_expiring_week || 0,
            conversion_rate: data.conversion_rate || 0
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [supabase]);

  if (loading) return <div className="text-white">Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ModernCard>
        <ModernCardContent className="p-6 flex items-center gap-4">
          <div className="p-4 bg-blue-900/50 rounded-lg text-blue-400">
            <Users size={32} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Total Active Subscribers</p>
            <h3 className="text-3xl font-bold text-white">{stats.active_subscribers}</h3>
          </div>
        </ModernCardContent>
      </ModernCard>

      <ModernCard>
        <ModernCardContent className="p-6 flex items-center gap-4">
          <div className="p-4 bg-amber-900/50 rounded-lg text-amber-400">
            <Clock size={32} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Total Active Trials</p>
            <h3 className="text-3xl font-bold text-white">{stats.active_trials}</h3>
          </div>
        </ModernCardContent>
      </ModernCard>

      <ModernCard>
        <ModernCardContent className="p-6 flex items-center gap-4">
          <div className="p-4 bg-red-900/50 rounded-lg text-red-400">
            <AlertTriangle size={32} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Trials Expiring This Week</p>
            <h3 className="text-3xl font-bold text-white">{stats.trials_expiring_week}</h3>
          </div>
        </ModernCardContent>
      </ModernCard>

      <ModernCard>
        <ModernCardContent className="p-6 flex items-center gap-4">
          <div className="p-4 bg-green-900/50 rounded-lg text-green-400">
            <TrendingUp size={32} />
          </div>
          <div>
            <p className="text-gray-400 text-sm font-medium">Conversion Rate (Trial → Paid)</p>
            <h3 className="text-3xl font-bold text-white">{stats.conversion_rate}%</h3>
          </div>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
}

export default function AdminProPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#1F2937]">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase text-white mb-2">
              PRO Management
            </h1>
            <p className="text-gray-400">
              Manage subscriptions, trials, and PRO configuration
            </p>
          </div>

          <Tabs defaultValue="subscribers" className="w-full">
            <TabsList className="bg-[#111827] border border-gray-700 mb-6">
              <TabsTrigger value="subscribers" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Suscriptores
              </TabsTrigger>
              <TabsTrigger value="grant" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Otorgar Manual
              </TabsTrigger>
              <TabsTrigger value="config" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Configuración
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                Estadísticas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscribers">
              <ProSubscribersTab />
            </TabsContent>

            <TabsContent value="grant">
              <GrantManualTab />
            </TabsContent>

            <TabsContent value="config">
              <ConfigTab />
            </TabsContent>

            <TabsContent value="stats">
              <StatsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminGuard>
  );
}
