'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CancelDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysRemaining: number;
}

export function CancelDeletionDialog({
  open,
  onOpenChange,
  daysRemaining
}: CancelDeletionDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Call cancel_account_deletion RPC
      const { error } = await supabase.rpc('cancel_account_deletion');

      if (error) {
        toast.error(`Failed to cancel deletion: ${error.message}`);
        setLoading(false);
        return;
      }

      // Success
      toast.success('Account deletion cancelled! Your account has been restored.');
      onOpenChange(false);

      // Refresh the page to update UI
      router.refresh();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-gray-50 border-gray-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <RotateCcw className="h-5 w-5 text-green-500" />
            Cancel Account Deletion
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Are you sure you want to cancel your account deletion?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Alert className="bg-green-500/10 border-green-500">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-gray-600">
              <p className="font-semibold mb-2">Your account will be fully restored:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>You'll keep all your listings and templates</li>
                <li>Your messages and chats will remain</li>
                <li>Your profile will stay active</li>
                <li>All ratings and reviews preserved</li>
              </ul>
              <p className="mt-3 text-xs text-gray-600">
                You currently have {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining before permanent deletion.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-gray-200 text-gray-600 hover:bg-gray-100"
          >
            Close
          </Button>
          <Button
            onClick={handleCancel}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Yes, Restore My Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
