import type { PackageStatus } from '../../types/package';

interface BadgeProps {
  status: PackageStatus;
}

export const Badge = ({ status }: BadgeProps) => {
  const getBadgeStyle = (status: PackageStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-surface-700 text-gray-300 border-surface-600';
      case 'PICKED_UP':
        return 'bg-blue-900 text-blue-300 border-blue-800';
      case 'IN_TRANSIT':
        return 'bg-yellow-900 text-yellow-300 border-yellow-800';
      case 'DELIVERED':
        return 'bg-green-900 text-green-300 border-green-800';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-900 text-red-300 border-red-800';
      default:
        return 'bg-surface-700 text-gray-300 border-surface-600';
    }
  };

  const formattedStatus = status.replace('_', ' ');

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(status)}`}>
      {formattedStatus}
    </span>
  );
};
