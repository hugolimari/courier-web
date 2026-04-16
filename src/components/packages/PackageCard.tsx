import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Package, PackageStatus } from '../../types/package';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

interface PackageCardProps {
  pkg: Package;
  onUpdateStatus: (id: string, newStatus: PackageStatus) => Promise<void>;
}

// Status machine: maps current state → allowed next states
const NEXT_STATUS: Partial<Record<PackageStatus, PackageStatus[]>> = {
  PENDING:    ['PICKED_UP', 'CANCELLED'],
  PICKED_UP:  ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
};

const DANGER_STATUSES: PackageStatus[] = ['FAILED', 'CANCELLED'];

export const PackageCard = ({ pkg, onUpdateStatus }: PackageCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const canUpdate = user?.role === 'ADMIN' || user?.role === 'COURIER';
  const nextOptions = NEXT_STATUS[pkg.status] ?? [];
  const isActive = pkg.status === 'PENDING' || pkg.status === 'PICKED_UP' || pkg.status === 'IN_TRANSIT';

  const handleAction = async (status: PackageStatus) => {
    if (status === 'DELIVERED') {
      navigate(`/packages/${pkg.id}/deliver`);
      return;
    }
    setIsUpdating(true);
    try {
      await onUpdateStatus(pkg.id, status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      {/* Header row */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3 className="text-white font-bold tracking-tight font-mono text-sm">{pkg.tracking_number}</h3>
          {pkg.location_reference && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">📌 {pkg.location_reference}</p>
          )}
        </div>
        <Badge status={pkg.status} />
      </div>

      {/* Details block */}
      <div className="bg-surface-900/60 rounded-lg p-3 text-sm flex flex-col gap-1.5">
        <Row label="Destino" value={pkg.destination_address} />
        <Row label="Cliente" value={pkg.customer_name} />
        {pkg.courier_name && <Row label="Courier" value={pkg.courier_name} />}
        <div className="flex justify-between pt-2 mt-1 border-t border-surface-700">
          <span className="text-gray-400">Cobro (Bs)</span>
          <span className="text-primary-400 font-bold">{pkg.cash_to_collect}</span>
        </div>
      </div>

      {/* Action buttons */}
      {(canUpdate && nextOptions.length > 0) || (user?.role === 'COURIER' && isActive) ? (
        <div className="flex gap-2 mt-1 flex-wrap">
          {/* Map button — only for COURIER on active packages */}
          {user?.role === 'COURIER' && isActive && (
            <Button
              variant="outline"
              className="flex-1 text-xs py-1.5 border-primary-700 text-primary-400 hover:border-primary-500"
              onClick={() => navigate(`/packages/${pkg.id}/map`)}
            >
              📍 Ver Mapa
            </Button>
          )}

          {/* Status transition buttons */}
          {canUpdate && nextOptions.map(option => (
            <Button
              key={option}
              variant={DANGER_STATUSES.includes(option) ? 'danger' : 'primary'}
              className="flex-1 text-xs py-1.5"
              isLoading={isUpdating}
              onClick={() => handleAction(option)}
            >
              {option.replace('_', ' ')}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// Small helper component
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-2">
    <span className="text-gray-400 shrink-0">{label}:</span>
    <span className="text-gray-200 text-right">{value}</span>
  </div>
);
