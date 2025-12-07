'use client';

import { useState } from 'react';
import { useAccountDeletionStatus } from '@/hooks/deletion/useAccountDeletionStatus';
import { CancelDeletionDialog } from './CancelDeletionDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

export function AccountDeletionBanner() {
  const { status, loading } = useAccountDeletionStatus();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if loading, no status, not scheduled, or dismissed
  if (loading || !status || !status.isScheduled || dismissed) {
    return null;
  }

  const getUrgencyStyle = () => {
    if (status.daysRemaining <= 1) {
      return 'bg-red-500 border-red-600';
    } else if (status.daysRemaining <= 7) {
      return 'bg-orange-500 border-orange-600';
    } else {
      return 'bg-yellow-500 border-yellow-600';
    }
  };

  return (
    <>
      <Alert className={`rounded-none border-x-0 border-t-0 ${getUrgencyStyle()}`}>
        <div className="container mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <AlertTriangle className="h-5 w-5 text-white" />
              <AlertDescription className="text-white font-semibold flex-1">
                {status.daysRemaining === 0 ? (
                  'Your account will be permanently deleted very soon!'
                ) : (
                  <>
                    Your account will be permanently deleted in{' '}
                    <span className="font-black">
                      {status.daysRemaining} {status.daysRemaining === 1 ? 'day' : 'days'}
                    </span>
                  </>
                )}
              </AlertDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowCancelDialog(true)}
                variant="outline"
                size="sm"
                className="bg-white text-black hover:bg-gray-100 border-white font-semibold"
              >
                Cancel Deletion
              </Button>
              <Button
                onClick={() => setDismissed(true)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Alert>

      <CancelDeletionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        daysRemaining={status.daysRemaining}
      />
    </>
  );
}
