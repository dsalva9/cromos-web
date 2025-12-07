import { Metadata } from 'next';
import { RetentionDashboard, RetentionQueueTable } from '@/components/admin/retention';
import { ModernCard, ModernCardContent, ModernCardHeader } from '@/components/ui/modern-card';
import { Shield, Clock, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Gestión de Retención de Datos | Admin',
  description: 'Gestionar eliminaciones programadas, retenciones legales y cumplimiento de GDPR/DSA',
};

export default function AdminRetentionPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#FFC000]" />
            Gestión de Retención de Datos
          </h1>
          <p className="text-gray-400 mt-2">
            Sistema de retención conforme con GDPR y DSA
          </p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <RetentionDashboard />

      {/* Important Notice */}
      <ModernCard className="border-orange-700 bg-orange-900/10">
        <ModernCardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-200 mb-1">Información Importante</h3>
              <ul className="text-sm text-orange-300 space-y-1">
                <li>• Las eliminaciones se procesan automáticamente cada día a las 02:00 UTC</li>
                <li>• Las retenciones legales pausan la eliminación hasta que se eliminen o expiren</li>
                <li>• Los usuarios suspendidos NO pueden iniciar sesión hasta ser reactivados</li>
                <li>• Las acciones de admin (suspensión, eliminación) se registran en audit_log</li>
              </ul>
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>

      {/* Retention Queue */}
      <ModernCard>
        <ModernCardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#FFC000]" />
              <h2 className="text-xl font-semibold text-white">Cola de Eliminación</h2>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Todos los elementos programados para eliminación permanente
          </p>
        </ModernCardHeader>
        <ModernCardContent>
          <RetentionQueueTable />
        </ModernCardContent>
      </ModernCard>

      {/* Help Section */}
      <ModernCard>
        <ModernCardHeader>
          <h3 className="text-lg font-semibold text-white">Guía Rápida</h3>
        </ModernCardHeader>
        <ModernCardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-2">Suspensión de Cuenta</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Suspender usuario → Indefinido, sin eliminación</li>
                <li>Usuario no puede iniciar sesión</li>
                <li>Contenido oculto para usuarios normales</li>
                <li>Puede reactivar en cualquier momento</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Mover a Eliminación</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Programar eliminación en 90 días</li>
                <li>Usuario permanece suspendido</li>
                <li>Sin correos de advertencia al usuario</li>
                <li>Admin puede reactivar antes de 90 días</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Retención Legal</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Pausa la eliminación programada</li>
                <li>Requiere fecha de expiración y motivo</li>
                <li>Para investigaciones/casos legales</li>
                <li>Eliminar cuando el caso se resuelva</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Auto-Eliminación de Usuario</h4>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Usuario solicita eliminación de cuenta</li>
                <li>90 días de período de recuperación</li>
                <li>Correos de advertencia (7, 3, 1 día)</li>
                <li>Usuario puede cancelar vía enlace en correo</li>
              </ol>
            </div>
          </div>
        </ModernCardContent>
      </ModernCard>
    </div>
  );
}
