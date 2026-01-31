'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { AlertTriangle, LogOut, Trash2, Loader2, Lightbulb } from 'lucide-react';
import { useSupabaseClient, useUser } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DeleteAccountDialog } from '@/components/deletion';
import { ThemeSettingsSection } from './ThemeSettingsSection';

export function SystemSettingsTab() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const { user } = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleReactivateTips = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('dismissed-tips');
        toast.success('Consejos reactivados correctamente');
      }
    } catch (error) {
      console.error('Error reactivating tips:', error);
      toast.error('Error al reactivar los consejos');
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      setSigningOut(true);

      // Sign out from all sessions using Supabase's global sign out
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) throw error;

      toast.success('Se ha cerrado sesión en todos los dispositivos');
      router.push('/login');
    } catch (error) {
      console.error('Error signing out from all devices:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al cerrar sesión en todos los dispositivos'
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
                Consejos de ayuda
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
                Muestra consejos contextuales en las distintas secciones de la app para ayudarte a usar todas las funciones.
              </p>
              <Button
                onClick={handleReactivateTips}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm md:text-base"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Reactivar consejos
              </Button>
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
                Cerrar sesión en todos los dispositivos
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
                Cierra tu sesión en todos los dispositivos donde hayas iniciado
                sesión, incluyendo este. Tendrás que volver a iniciar sesión.
              </p>
              <Button
                onClick={handleSignOutAllDevices}
                disabled={signingOut}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm md:text-base"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cerrando sesión...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="sm:hidden">Cerrar sesión en todos</span>
                    <span className="hidden sm:inline">Cerrar sesión en todos los dispositivos</span>
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
                Eliminar mi cuenta
              </h3>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4">
                Esta acción programará tu cuenta para eliminación permanente en 90 días.
                Durante este período puedes cancelar la eliminación. Perderás:
              </p>
              <ul className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4 list-disc list-inside space-y-1">
                <li>Todos tus datos de usuario</li>
                <li>Historial de intercambios</li>
                <li>Todos tus anuncios del marketplace</li>
                <li>Tus colecciones y plantillas</li>
                <li>Mensajes y conversaciones</li>
                <li>Valoraciones y comentarios</li>
              </ul>
              <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-400 rounded-lg p-3 md:p-4 mb-4">
                <p className="text-sm md:text-base text-red-600 dark:text-red-400 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  Esta acción es irreversible
                </p>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="outline"
                className="bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border-2 border-red-500 dark:border-red-400 hover:text-red-700 dark:hover:text-red-300 w-full sm:w-auto text-sm md:text-base"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar mi cuenta
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
