'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flag, Users, Search, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { ModernCard } from '@/components/ui/modern-card';
import { Switch } from '@/components/ui/switch';

type FeatureFlag = {
  id: string;
  description: string | null;
  enabled: boolean;
  override_count: number;
  created_at: string;
  updated_at: string;
};

type UserOverride = {
  user_id: string;
  nickname: string;
  enabled: boolean;
};

export default function FeatureFlagsPage() {
  const supabase = useSupabaseClient();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);

  // Per-flag override management
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<UserOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  // User search for adding overrides
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; nickname: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingOverride, setAddingOverride] = useState(false);

  const fetchFlags = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_all_feature_flags');
    if (error) {
      toast.error('Failed to load feature flags');
      console.error(error);
      return;
    }
    setFlags((data as FeatureFlag[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const toggleGlobalFlag = async (flagId: string, currentEnabled: boolean) => {
    setTogglingFlag(flagId);
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: !currentEnabled, updated_at: new Date().toISOString() })
      .eq('id', flagId);

    if (error) {
      toast.error('Failed to toggle flag');
      console.error(error);
    } else {
      toast.success(`Flag "${flagId}" ${!currentEnabled ? 'enabled' : 'disabled'} globally`);
      await fetchFlags();
    }
    setTogglingFlag(null);
  };

  const fetchOverrides = useCallback(async (flagId: string) => {
    setLoadingOverrides(true);
    const { data, error } = await supabase
      .from('user_feature_overrides')
      .select('user_id, enabled, profiles!inner(nickname)')
      .eq('flag_id', flagId);

    if (error) {
      toast.error('Failed to load overrides');
      console.error(error);
      setLoadingOverrides(false);
      return;
    }

    setOverrides(
      (data ?? []).map((row: Record<string, unknown>) => ({
        user_id: row.user_id as string,
        nickname: (row.profiles as Record<string, unknown>)?.nickname as string ?? 'Unknown',
        enabled: row.enabled as boolean,
      }))
    );
    setLoadingOverrides(false);
  }, [supabase]);

  const handleExpandFlag = async (flagId: string) => {
    if (expandedFlag === flagId) {
      setExpandedFlag(null);
      setOverrides([]);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }
    setExpandedFlag(flagId);
    setSearchQuery('');
    setSearchResults([]);
    await fetchOverrides(flagId);
  };

  const searchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname')
      .ilike('nickname', `%${query}%`)
      .limit(10);

    if (error) {
      console.error(error);
    } else {
      // Filter out users who already have an override for this flag
      const existingUserIds = new Set(overrides.map(o => o.user_id));
      setSearchResults(
        (data ?? [])
          .filter((u: Record<string, unknown>) => !existingUserIds.has(u.id as string))
          .map((u: Record<string, unknown>) => ({
            id: u.id as string,
            nickname: (u.nickname as string) ?? 'Unknown',
          }))
      );
    }
    setSearching(false);
  };

  const addUserOverride = async (userId: string, nickname: string) => {
    if (!expandedFlag) return;
    setAddingOverride(true);
    const { error } = await supabase
      .from('user_feature_overrides')
      .upsert({
        user_id: userId,
        flag_id: expandedFlag,
        enabled: true,
      });

    if (error) {
      toast.error('Failed to add override');
      console.error(error);
    } else {
      toast.success(`Override added for ${nickname}`);
      setSearchQuery('');
      setSearchResults([]);
      await fetchOverrides(expandedFlag);
      await fetchFlags(); // Refresh override count
    }
    setAddingOverride(false);
  };

  const toggleUserOverride = async (userId: string, currentEnabled: boolean) => {
    if (!expandedFlag) return;
    const { error } = await supabase
      .from('user_feature_overrides')
      .update({ enabled: !currentEnabled })
      .eq('user_id', userId)
      .eq('flag_id', expandedFlag);

    if (error) {
      toast.error('Failed to toggle override');
    } else {
      await fetchOverrides(expandedFlag);
    }
  };

  const removeUserOverride = async (userId: string, nickname: string) => {
    if (!expandedFlag) return;
    const { error } = await supabase
      .from('user_feature_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('flag_id', expandedFlag);

    if (error) {
      toast.error('Failed to remove override');
    } else {
      toast.success(`Override removed for ${nickname}`);
      await fetchOverrides(expandedFlag);
      await fetchFlags(); // Refresh override count
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Feature Flags</h1>
        <p className="text-zinc-400">
          Manage feature rollouts. Toggle flags globally or enable per-user for testing.
        </p>
      </div>

      {/* Flags List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
          <p className="text-zinc-400 mt-4">Loading feature flags...</p>
        </div>
      ) : flags.length === 0 ? (
        <ModernCard className="p-8">
          <div className="text-center">
            <Flag className="mx-auto text-zinc-600 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">No Feature Flags</h3>
            <p className="text-zinc-400 text-sm">
              No feature flags have been created yet.
            </p>
          </div>
        </ModernCard>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <ModernCard key={flag.id} className="overflow-hidden">
              {/* Flag Row */}
              <div className="p-6 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <code className="text-sm font-mono text-gold bg-gold/10 px-2 py-0.5 rounded">
                      {flag.id}
                    </code>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        flag.enabled
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          flag.enabled ? 'bg-green-400' : 'bg-zinc-400'
                        }`}
                      ></span>
                      {flag.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  {flag.description && (
                    <p className="text-zinc-400 text-sm mt-1">{flag.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                    <span>
                      Created{' '}
                      {new Date(flag.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {flag.override_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {flag.override_count} override{flag.override_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Manage Overrides Button */}
                  <button
                    onClick={() => handleExpandFlag(flag.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      expandedFlag === flag.id
                        ? 'bg-gold/20 text-gold'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    <Users size={14} />
                    Overrides
                  </button>

                  {/* Global Toggle */}
                  <Switch
                    checked={flag.enabled}
                    disabled={togglingFlag === flag.id}
                    onCheckedChange={() => toggleGlobalFlag(flag.id, flag.enabled)}
                  />
                </div>
              </div>

              {/* Expanded Override Management */}
              {expandedFlag === flag.id && (
                <div className="border-t border-zinc-700 bg-zinc-900/50 p-6 space-y-4">
                  <h4 className="text-sm font-semibold text-white">Per-User Overrides</h4>

                  {/* User Search */}
                  <div className="relative">
                    <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                      <Search size={16} className="text-zinc-400 shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => searchUsers(e.target.value)}
                        placeholder="Search user by nickname..."
                        className="w-full bg-transparent text-white text-sm placeholder:text-zinc-500 outline-none"
                      />
                      {searching && <Loader2 size={16} className="text-zinc-400 animate-spin shrink-0" />}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => addUserOverride(user.id, user.nickname)}
                            disabled={addingOverride}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-700 text-left transition-colors disabled:opacity-50"
                          >
                            <span className="text-white text-sm">{user.nickname}</span>
                            <Plus size={14} className="text-gold shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Current Overrides List */}
                  {loadingOverrides ? (
                    <div className="flex items-center gap-2 text-zinc-400 text-sm py-3">
                      <Loader2 size={14} className="animate-spin" />
                      Loading overrides...
                    </div>
                  ) : overrides.length === 0 ? (
                    <p className="text-zinc-500 text-sm py-2">
                      No per-user overrides. All users follow the global setting.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {overrides.map((override) => (
                        <div
                          key={override.user_id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800"
                        >
                          <span className="text-white text-sm font-medium">{override.nickname}</span>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={override.enabled}
                              onCheckedChange={() =>
                                toggleUserOverride(override.user_id, override.enabled)
                              }
                            />
                            <button
                              onClick={() => removeUserOverride(override.user_id, override.nickname)}
                              className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Remove override"
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ModernCard>
          ))}
        </div>
      )}
    </div>
  );
}
