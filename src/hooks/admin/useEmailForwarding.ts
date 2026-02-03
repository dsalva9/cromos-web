import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface ForwardingAddress {
  id: number;
  email: string;
  is_active: boolean;
  added_by: string | null;
  added_by_username: string | null;
  added_at: string;
  last_used_at: string | null;
}

interface UseEmailForwardingReturn {
  addresses: ForwardingAddress[];
  loading: boolean;
  error: string | null;
  fetchAddresses: () => Promise<void>;
  addAddress: (email: string) => Promise<void>;
  removeAddress: (id: number) => Promise<void>;
  toggleAddress: (id: number, isActive: boolean) => Promise<void>;
}

export function useEmailForwarding(): UseEmailForwardingReturn {
  const [addresses, setAddresses] = useState<ForwardingAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_forwarding_addresses');

      if (rpcError) throw rpcError;

      setAddresses(data || []);
    } catch (err) {
      console.error('Error fetching forwarding addresses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  }, []);

  const addAddress = useCallback(async (email: string) => {
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('admin_add_forwarding_address', {
        p_email: email,
      });

      if (rpcError) throw rpcError;

      await fetchAddresses();
    } catch (err) {
      console.error('Error adding forwarding address:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add address';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchAddresses]);

  const removeAddress = useCallback(async (id: number) => {
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('admin_remove_forwarding_address', {
        p_id: id,
      });

      if (rpcError) throw rpcError;

      await fetchAddresses();
    } catch (err) {
      console.error('Error removing forwarding address:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove address';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchAddresses]);

  const toggleAddress = useCallback(async (id: number, isActive: boolean) => {
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('admin_toggle_forwarding_address', {
        p_id: id,
        p_is_active: isActive,
      });

      if (rpcError) throw rpcError;

      await fetchAddresses();
    } catch (err) {
      console.error('Error toggling forwarding address:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle address';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchAddresses]);

  return {
    addresses,
    loading,
    error,
    fetchAddresses,
    addAddress,
    removeAddress,
    toggleAddress,
  };
}
