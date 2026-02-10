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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from '@/hooks/use-router';
import { toast } from 'sonner';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  userEmail
}: DeleteAccountDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleDelete = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // 1. Verify email matches
      if (email !== userEmail) {
        toast.error('Email does not match your account email');
        setLoading(false);
        return;
      }

      // 2. Verify password by attempting to sign in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (authError) {
        toast.error('Incorrect password');
        setLoading(false);
        return;
      }

      // 3. Call delete_account RPC
      const { error: deleteError } = await supabase.rpc('delete_account');

      if (deleteError) {
        toast.error(`Failed to delete account: ${deleteError.message}`);
        setLoading(false);
        return;
      }

      // 4. Success - account scheduled for deletion
      toast.success('Account scheduled for deletion. Check your email for recovery instructions.');

      // 5. Sign out user
      await supabase.auth.signOut();

      // 6. Redirect to home
      router.push('/');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  const isFormValid = email === userEmail && password.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete Account
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            This action will permanently delete your account after 90 days.
            You can cancel within this period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>What will be deleted:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>All your marketplace listings</li>
                <li>Your private templates</li>
                <li>Your messages and chats</li>
                <li>Your profile and avatar</li>
                <li>Your ratings and reviews</li>
              </ul>
              <p className="mt-3 font-semibold">
                You have 90 days to cancel by clicking the link in the email we'll send you.
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-gray-600 dark:text-gray-400">
                Confirm your email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={userEmail}
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white mt-1"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-600 dark:text-gray-400">
                Enter your password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white mt-1"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isFormValid || loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
