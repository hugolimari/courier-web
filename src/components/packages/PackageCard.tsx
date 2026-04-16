import { useState } from 'react';
import type { Package, PackageStatus } from '../../types/package';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

interface PackageCardProps {
  pkg: Package;
  onUpdateStatus?: (id: string, newStatus: PackageStatus) => Promise<void>;
}

export const PackageCard = ({ pkg, onUpdateStatus }: PackageCardProps) => {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const canUpdate = user?.role === 'ADMIN' || user?.role === 'COURIER';
  
  // Determine next logic steps
  const getNextStatusOptions = (currentStatus: PackageStatus): PackageStatus[] => {
    switch (currentStatus) {
      case 'PENDING':
        return ['PICKED_UP', 'CANCELLED'];
      case 'PICKED_UP':
        return ['IN_TRANSIT', 'FAILED'];
      case 'IN_TRANSIT':
        return ['DELIVERED', 'FAILED'];
      default:
        // DELIVERED, FAILED, CANCELLED are final states
        return [];
    }
  };

  const nextOptions = getNextStatusOptions(pkg.status);

  const handleUpdate = async (status: PackageStatus) => {
    if (!onUpdateStatus) return;
    setIsUpdating(true);
    try {
      await onUpdateStatus(pkg.id, status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-bold tracking-tight">{pkg.tracking_number}</h3>
          <p className="text-xs text-gray-400 mt-1">Ref: {pkg.location_reference}</p>
        </div>
        <Badge status={pkg.status} />
      </div>

      {/* Details */}
      <div className="bg-surface-900/50 rounded-lg p-3 text-sm flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Destino:</span>
          <span className="text-gray-200 font-medium text-right ml-2 line-clamp-2">{pkg.destination_address}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Cliente:</span>
          <span className="text-gray-200">{pkg.customer_name}</span>
        </div>
        {pkg.courier_name && (
           <div className="flex justify-between">
             <span className="text-gray-400">Courier:</span>
             <span className="text-gray-200">{pkg.courier_name}</span>
           </div>
        )}
        <div className="flex justify-between mt-1 pt-2 border-t border-surface-700">
          <span className="text-gray-400">Cobro (Bs):</span>
          <span className="text-primary-400 font-bold">{pkg.cash_to_collect}</span>
        </div>
      </div>

      {/* Actions */}
      {canUpdate && nextOptions.length > 0 && (
        <div className="flex gap-2 mt-2">
          {nextOptions.map(option => {
            const isDanger = option === 'FAILED' || option === 'CANCELLED';
            return (
              <Button 
                key={option}
                variant={isDanger ? 'danger' : 'primary'}
                className="flex-1 text-xs py-1.5"
                isLoading={isUpdating}
                onClick={() => handleUpdate(option)}
              >
                {option.replace('_', ' ')}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
};
