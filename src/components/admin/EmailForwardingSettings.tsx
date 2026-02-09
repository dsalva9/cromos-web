'use client';

import { useEffect, useState } from 'react';
import { Mail, Plus, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { useEmailForwarding } from '@/hooks/admin/useEmailForwarding';
import AddForwardingAddressDialog from './AddForwardingAddressDialog';

export default function EmailForwardingSettings() {
  const { addresses, loading, error, fetchAddresses, addAddress, removeAddress, toggleAddress } =
    useEmailForwarding();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleRemove = async (id: number, email: string) => {
    if (!confirm(`Are you sure you want to remove forwarding to ${email}?`)) {
      return;
    }

    setRemovingId(id);
    try {
      await removeAddress(id);
      toast.success('Forwarding address removed');
    } catch (error) {
      toast.error('Failed to remove address');
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggle = async (id: number, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await toggleAddress(id, !currentStatus);
      toast.success(currentStatus ? 'Address deactivated' : 'Address activated');
    } catch (error) {
      toast.error('Failed to toggle address');
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Email Forwarding</h2>
          <p className="text-zinc-400 text-sm max-w-2xl">
            Configure email addresses that will receive forwarded messages sent to @cambiocromos.com.
            All emails received at your domain will be automatically forwarded to active addresses below.
          </p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFC000] text-black font-semibold rounded-lg hover:bg-[#FFD54F] transition-colors"
        >
          <Plus size={20} />
          Add Address
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Addresses Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC000]"></div>
          <p className="text-zinc-400 mt-4">Loading forwarding addresses...</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <Mail className="mx-auto text-zinc-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">No Forwarding Addresses</h3>
          <p className="text-zinc-400 text-sm mb-6">
            Add an email address to start receiving forwarded emails.
          </p>
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFC000] text-black font-semibold rounded-lg hover:bg-[#FFD54F] transition-colors"
          >
            <Plus size={20} />
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Added By</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Added Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Last Used</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {addresses.map((address) => (
                <tr key={address.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-zinc-400" />
                      <span className="text-white font-medium">{address.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {address.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 text-zinc-400 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full"></span>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-sm">
                    {address.added_by_username || 'Unknown'}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-sm">{formatDate(address.added_at)}</td>
                  <td className="py-3 px-4 text-zinc-400 text-sm">{formatDate(address.last_used_at)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(address.id, address.is_active)}
                        disabled={togglingId === address.id}
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
                        title={address.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {address.is_active ? (
                          <PowerOff size={18} className="text-zinc-400" />
                        ) : (
                          <Power size={18} className="text-zinc-400" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRemove(address.id, address.email)}
                        disabled={removingId === address.id}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove"
                      >
                        <Trash2 size={18} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Dialog */}
      <AddForwardingAddressDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={addAddress}
      />
    </div>
  );
}
