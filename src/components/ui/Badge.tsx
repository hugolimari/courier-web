import type { PackageStatus } from '../../types/package';

// Spanish labels for each status
export const STATUS_LABELS: Record<PackageStatus, string> = {
  PENDING:    'Pendiente',
  PICKED_UP:  'Recogido',
  IN_TRANSIT: 'En Tránsito',
  DELIVERED:  'Entregado',
  FAILED:     'Fallido',
  CANCELLED:  'Cancelado',
};

// Spanish labels for next-step action buttons
export const ACTION_LABELS: Record<PackageStatus, string> = {
  PENDING:    'Pendiente',
  PICKED_UP:  'Confirmar Recogida',
  IN_TRANSIT: 'Poner en Tránsito',
  DELIVERED:  'Registrar Entrega',
  FAILED:     'Marcar Fallido',
  CANCELLED:  'Cancelar',
};

interface BadgeProps {
  status: PackageStatus;
}

const BADGE_STYLES: Record<PackageStatus, string> = {
  PENDING:    'bg-surface-700 text-gray-300 border-surface-600',
  PICKED_UP:  'bg-blue-900/60 text-blue-300 border-blue-800',
  IN_TRANSIT: 'bg-yellow-900/60 text-yellow-300 border-yellow-800',
  DELIVERED:  'bg-green-900/60 text-green-300 border-green-800',
  FAILED:     'bg-red-900/60 text-red-300 border-red-800',
  CANCELLED:  'bg-red-900/60 text-red-300 border-red-800',
};

export const Badge = ({ status }: BadgeProps) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${BADGE_STYLES[status] ?? BADGE_STYLES.PENDING}`}>
    {STATUS_LABELS[status] ?? status}
  </span>
);
