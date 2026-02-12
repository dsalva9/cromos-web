import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { useProfileCompletion } from '@/components/providers/ProfileCompletionProvider';

interface DeletionStatus {
  isScheduled: boolean;
  scheduledFor: string | null;
  deletedAt: string | null;
  daysRemaining: number;
  reason: string | null;
}

export function useAccountDeletionStatus() {
  const { profile, loading: profileLoading } = useProfileCompletion();
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for ProfileCompletionProvider to finish loading
    if (profileLoading) return;

    const deletedAt = profile?.deleted_at ?? null;

    if (!deletedAt) {
      setStatus({
        isScheduled: false,
        scheduledFor: null,
        deletedAt: null,
        daysRemaining: 0,
        reason: null
      });
      setLoading(false);
      return;
    }

    // Only query retention_schedule if deletion is actually scheduled
    async function fetchSchedule() {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: schedule } = await supabase
          .from('retention_schedule')
          .select('scheduled_for, reason')
          .eq('entity_type', 'user')
          .eq('entity_id', user.id)
          .is('processed_at', null)
          .single();

        if (schedule) {
          const scheduledDate = new Date(schedule.scheduled_for);
          const now = new Date();
          const daysRemaining = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          setStatus({
            isScheduled: true,
            scheduledFor: schedule.scheduled_for,
            deletedAt,
            daysRemaining: Math.max(0, daysRemaining),
            reason: schedule.reason
          });
        } else {
          setStatus({
            isScheduled: false,
            scheduledFor: null,
            deletedAt,
            daysRemaining: 0,
            reason: null
          });
        }
      } catch (error) {
        logger.error('Error checking deletion status:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSchedule();
  }, [profile?.deleted_at, profileLoading]);

  return { status, loading };
}
