'use client';

import { useEffect, useState, useCallback } from 'react';
import { Mail, Send, Calendar, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEmailForwarding } from '@/hooks/admin/useEmailForwarding';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

type SummaryFrequency = 'none' | 'daily' | 'weekly';

export default function NewUserSummarySettings() {
    const { addresses, loading, fetchAddresses } = useEmailForwarding();
    const supabase = useSupabaseClient();
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [sendingManual, setSendingManual] = useState(false);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const handleFrequencyChange = async (id: number, frequency: SummaryFrequency) => {
        setUpdatingId(id);
        try {
            const { error } = await supabase.rpc('admin_update_summary_frequency', {
                p_id: id,
                p_frequency: frequency,
            });

            if (error) throw error;

            toast.success('Preferencia actualizada');
            await fetchAddresses();
        } catch (err) {
            logger.error('Error updating frequency:', err);
            toast.error('Error al actualizar preferencia');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSendManualSummary = async () => {
        setSendingManual(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No hay sesión activa');
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-user-summary-email`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        frequency: 'manual',
                        days_lookback: 7,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al enviar resumen');
            }

            toast.success(
                `Resumen enviado a ${result.sent_count} destinatarios (${result.new_users_count} usuarios nuevos)`
            );
        } catch (err) {
            logger.error('Error sending manual summary:', err);
            toast.error(err instanceof Error ? err.message : 'Error al enviar resumen');
        } finally {
            setSendingManual(false);
        }
    };

    const getFrequencyLabel = (freq: SummaryFrequency) => {
        switch (freq) {
            case 'daily': return 'Diario';
            case 'weekly': return 'Semanal';
            default: return 'Ninguno';
        }
    };

    const getFrequencyIcon = (freq: SummaryFrequency) => {
        switch (freq) {
            case 'daily': return <Clock size={14} className="text-blue-400" />;
            case 'weekly': return <Calendar size={14} className="text-green-400" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">New Users Summary Email</h2>
                    <p className="text-zinc-400 text-sm max-w-2xl">
                        Configure automated summary emails for new user registrations.
                        Daily summaries are sent at 3:00 AM UTC, weekly summaries on Mondays at 3:00 AM UTC.
                        Each forwarding address can choose their preferred frequency.
                    </p>
                </div>
                <Button
                    onClick={handleSendManualSummary}
                    disabled={sendingManual || addresses.length === 0}
                    className="bg-[#FFC000] text-black font-semibold hover:bg-[#FFD54F] disabled:opacity-50"
                >
                    {sendingManual ? (
                        <>
                            <Loader2 size={18} className="animate-spin mr-2" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Send size={18} className="mr-2" />
                            Send Summary Now
                        </>
                    )}
                </Button>
            </div>

            {/* Info box */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-sm">
                    <strong>Manual summary:</strong> Clicking &quot;Send Summary Now&quot; will immediately send a 7-day summary to all active forwarding addresses, regardless of their frequency setting.
                </p>
            </div>

            {/* Addresses Table */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC000]"></div>
                    <p className="text-zinc-400 mt-4">Loading addresses...</p>
                </div>
            ) : addresses.length === 0 ? (
                <div className="text-center py-12 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <Mail className="mx-auto text-zinc-600 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-white mb-2">No Forwarding Addresses</h3>
                    <p className="text-zinc-400 text-sm">
                        Add forwarding addresses in the Email Forwarding section first.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-zinc-800">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Email</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Status</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-400">Summary Frequency</th>
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
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            {updatingId === address.id ? (
                                                <Loader2 size={16} className="animate-spin text-zinc-400" />
                                            ) : (
                                                getFrequencyIcon(address.summary_email_frequency as SummaryFrequency)
                                            )}
                                            <select
                                                value={address.summary_email_frequency || 'none'}
                                                onChange={(e) => handleFrequencyChange(address.id, e.target.value as SummaryFrequency)}
                                                disabled={updatingId === address.id || !address.is_active}
                                                className="bg-zinc-800 border border-zinc-700 text-white rounded-md px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="none">None</option>
                                                <option value="daily">Daily (3 AM UTC)</option>
                                                <option value="weekly">Weekly (Mon 3 AM UTC)</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Schedule info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={18} className="text-blue-400" />
                        <h3 className="font-semibold text-white">Daily Summary</h3>
                    </div>
                    <p className="text-zinc-400 text-sm">
                        Sent every day at 3:00 AM UTC. Includes users registered in the last 24 hours.
                    </p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar size={18} className="text-green-400" />
                        <h3 className="font-semibold text-white">Weekly Summary</h3>
                    </div>
                    <p className="text-zinc-400 text-sm">
                        Sent every Monday at 3:00 AM UTC. Includes users registered in the last 7 days.
                    </p>
                </div>
            </div>
        </div>
    );
}
