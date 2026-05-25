'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { AlertTriangle, LogOut, Trash2, Loader2, Lightbulb } from 'lucide-react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { useRouter } from '@/hooks/use-router';
import { toast } from 'sonner';
import { DeleteAccountDialog } from '@/components/deletion';
import { ThemeSettingsSection } from './ThemeSettingsSection';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';

export function SystemSettingsTab() {
  const t = useTranslations('settings');
  const supabase = useSupabaseClient();
  const router = useRouter();
  const { user } = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleReactivateTips = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('dismissed-tips');
        toast.success(t('system.reactivateTips.success'));
      }
    } catch (error) {
      logger.error('Error reactivating tips:', error);
      toast.error(t('system.reactivateTips.error'));
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      setSigningOut(true);

      // Sign out from all sessions using Supabase's global sign out
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) throw error;

      toast.success(t('system.signOutAll.success'));
      router.push('/login');
    } catch (error) {
      logger.error('Error signing out from all devices:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : t('system.signOutAll.error')
      );
    } finally {
      setSigningOut(false);
    }
  };


  return (
    <div className="space-y-4 md:space-y-6">
      {/* Theme Settings */}
      <ThemeSettingsSection />

      {/* Reactivate Tips */}
      <ModernCard className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <ModernCardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('system.reactivateTips.title')}
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
                {t('system.reactivateTips.description')}
              </p>
              <Button
                onClick={handleReactivateTips}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm md:text-base"
              >
                <Lightbulb className="h-4 w-4 mr-2" />{t('system.reactivateTips.button')}</Button>
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Sign Out All Devices */}
      <ModernCard className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <ModernCardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 flex items-center justify-center">
              <LogOut className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('system.signOutAll.title')}
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
                {t('system.signOutAll.description')}
              </p>
              <Button
                onClick={handleSignOutAllDevices}
                disabled={signingOut}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm md:text-base"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('system.signOutAll.loading')}</>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="sm:hidden">{t('system.signOutAll.buttonMobile')}</span>
                    <span className="hidden sm:inline">{t('system.signOutAll.title')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Delete Account */}
      <ModernCard className="bg-white dark:bg-gray-800 border-2 border-red-500 dark:border-red-400">
        <ModernCardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-400 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('system.deleteAccount.title')}
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
                {t('system.deleteAccount.description')}
              </p>
              <ul className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4 list-disc list-inside space-y-1">
                <li>{t('system.deleteAccount.list.data')}</li>
                <li>{t('system.deleteAccount.list.history')}</li>
                <li>{t('system.deleteAccount.list.listings')}</li>
                <li>{t('system.deleteAccount.list.collections')}</li>
                <li>{t('system.deleteAccount.list.messages')}</li>
                <li>{t('system.deleteAccount.list.reviews')}</li>
              </ul>
              <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-400 rounded-lg p-3 md:p-4 mb-4">
                <p className="text-sm md:text-base text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />{t('system.deleteAccount.warning')}</p>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="outline"
                className="bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border-2 border-red-500 dark:border-red-400 hover:text-red-700 dark:hover:text-red-300 w-full sm:w-auto text-sm md:text-base"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('system.deleteAccount.title')}
              </Button>
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userEmail={user?.email || ''}
      />
    </div>
  );
}
