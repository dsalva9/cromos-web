import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface DeletionStatus {
  isScheduled: boolean;
  scheduledFor: string | null;
  deletedAt: string | null;
  daysRemaining: number;
  reason: string | null;
}

export function useAccountDeletionStatus() {
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      const supabase = createClient();

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Check if user has deleted_at set
        const { data: profile } = await supabase
          .from('profiles')
          .select('deleted_at')
          .eq('id', user.id)
          .single();

        if (!profile?.deleted_at) {
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

        // Check retention_schedule for deletion date
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
            deletedAt: profile.deleted_at,
            daysRemaining: Math.max(0, daysRemaining),
            reason: schedule.reason
          });
        } else {
          setStatus({
            isScheduled: false,
            scheduledFor: null,
            deletedAt: profile.deleted_at,
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

    checkStatus();
  }, []);

  return { status, loading };
}
