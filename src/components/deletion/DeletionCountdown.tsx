import { Clock, AlertTriangle } from 'lucide-react';

interface DeletionCountdownProps {
  deletedAt: string;
  scheduledFor: string;
  entityType: 'listing' | 'template' | 'account';
  className?: string;
}

export function DeletionCountdown({
  deletedAt,
  scheduledFor,
  entityType,
  className = ''
}: DeletionCountdownProps) {
  const deletedDate = new Date(deletedAt);
  const scheduledDate = new Date(scheduledFor);
  const now = new Date();

  const daysSinceDeleted = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const getUrgencyColor = () => {
    if (daysRemaining <= 1) return 'text-red-500';
    if (daysRemaining <= 7) return 'text-orange-500';
    return 'text-yellow-500';
  };

  const getEntityLabel = () => {
    switch (entityType) {
      case 'listing': return 'anuncio';
      case 'template': return 'plantilla';
      case 'account': return 'cuenta';
    }
  };

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <AlertTriangle className={`h-5 w-5 mt-0.5 ${getUrgencyColor()}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>Eliminado hace {daysSinceDeleted} {daysSinceDeleted === 1 ? 'día' : 'días'}</span>
        </div>
        <p className={`mt-1 font-semibold ${getUrgencyColor()}`}>
          {daysRemaining === 0 ? (
            `Este ${getEntityLabel()} será eliminado permanentemente muy pronto`
          ) : (
            `Se eliminará permanentemente en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`
          )}
        </p>
        {entityType === 'account' && daysRemaining > 0 && (
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Aún puedes cancelar la eliminación antes del {scheduledDate.toLocaleDateString('es-ES')}
          </p>
        )}
      </div>
    </div>
  );
}
