import { Badge } from '@/components/ui/badge';

interface ListingTransactionBadgeProps {
  status: 'active' | 'reserved' | 'completed' | 'cancelled' | 'sold' | 'removed';
  buyerNickname?: string;
}

export function ListingTransactionBadge({
  status,
  buyerNickname,
}: ListingTransactionBadgeProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'active':
        return { label: 'Activo', className: 'bg-green-500 text-white' };
      case 'reserved':
        return {
          label: buyerNickname ? `Reservado - ${buyerNickname}` : 'Reservado',
          className: 'bg-yellow-500 text-black',
        };
      case 'completed':
        return { label: 'Completado', className: 'bg-blue-500 text-white' };
      case 'cancelled':
        return { label: 'Cancelado', className: 'bg-gray-600 text-white' };
      case 'sold':
        return { label: 'Vendido', className: 'bg-gray-500 text-white' };
      case 'removed':
        return { label: 'Eliminado', className: 'bg-red-500 text-white' };
      default:
        return { label: status, className: 'bg-gray-600 text-white' };
    }
  };

  const { label, className } = getStatusInfo();

  return (
    <Badge className={`${className} uppercase font-bold`}>{label}</Badge>
  );
}
