'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { AlertTriangle, LogOut, Trash2, Loader2 } from 'lucide-react';
import { useSupabaseClient } from '@/components/providers/SupabaseProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function SystemSettingsTab() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');

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

  const handleDeleteAccount = async () => {
    if (confirmText !== 'ELIMINAR') {
      toast.error('Debes escribir "ELIMINAR" para confirmar');
      return;
    }

    try {
      setDeletingAccount(true);

      // Call the database function to request account deletion
      const { error } = await supabase.rpc('request_account_deletion');

      if (error) throw error;

      toast.success(
        'Tu solicitud de eliminación de cuenta ha sido recibida. Un administrador la revisará pronto.'
      );

      // Sign out after requesting deletion
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al solicitar eliminación de cuenta'
      );
    } finally {
      setDeletingAccount(false);
      setShowDeleteDialog(false);
      setConfirmText('');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Sign Out All Devices */}
      <ModernCard className="bg-[#374151] border-2 border-black">
        <ModernCardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
              <LogOut className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                Cerrar sesión en todos los dispositivos
              </h3>
              <p className="text-sm md:text-base text-gray-400 mb-4">
                Cierra tu sesión en todos los dispositivos donde hayas iniciado
                sesión, incluyendo este. Tendrás que volver a iniciar sesión.
              </p>
              <Button
                onClick={handleSignOutAllDevices}
                disabled={signingOut}
                className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-black w-full sm:w-auto text-sm md:text-base"
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
      <ModernCard className="bg-[#374151] border-2 border-red-500">
        <ModernCardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                Eliminar mi cuenta
              </h3>
              <p className="text-sm md:text-base text-gray-400 mb-4">
                Esta acción suspenderá tu cuenta y notificará a los
                administradores para su eliminación manual. Perderás:
              </p>
              <ul className="text-sm md:text-base text-gray-400 mb-4 list-disc list-inside space-y-1">
                <li>Todos tus datos de usuario</li>
                <li>Historial de intercambios</li>
                <li>Todos tus anuncios del marketplace</li>
                <li>Tus colecciones y plantillas</li>
                <li>Mensajes y conversaciones</li>
                <li>Valoraciones y comentarios</li>
              </ul>
              <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-3 md:p-4 mb-4">
                <p className="text-sm md:text-base text-red-400 font-bold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  Esta acción es irreversible
                </p>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={deletingAccount}
                variant="outline"
                className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border-2 border-red-500 hover:text-red-300 w-full sm:w-auto text-sm md:text-base"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Solicitar eliminación de cuenta
              </Button>
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gray-800 border-2 border-red-500 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              ¿Estás absolutamente seguro?
            </AlertDialogTitle>
            <div className="text-gray-300 text-sm space-y-3">
              <p>
                Esta acción suspenderá tu cuenta y enviará una solicitud a los
                administradores para su eliminación permanente. No podrás
                recuperar:
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Tus datos de usuario</li>
                <li>Historial de transacciones</li>
                <li>Anuncios del marketplace</li>
                <li>Colecciones y plantillas</li>
                <li>Mensajes y chats</li>
              </ul>
              <div className="p-3 bg-red-900/30 border border-red-500 rounded">
                <p className="font-bold text-red-400">
                  Para confirmar, escribe &quot;ELIMINAR&quot; a continuación:
                </p>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Escribe ELIMINAR"
              className="w-full px-4 py-2 bg-gray-900 border-2 border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-gray-700 hover:bg-gray-600 text-white border-2 border-black"
              onClick={() => {
                setConfirmText('');
                setShowDeleteDialog(false);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'ELIMINAR' || deletingAccount}
              className="bg-red-600 hover:bg-red-700 text-white border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar mi cuenta
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
