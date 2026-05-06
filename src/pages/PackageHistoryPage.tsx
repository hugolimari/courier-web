import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { packageService } from '../services/package.service';
import { userService } from '../services/user.service';
import { Badge, STATUS_LABELS } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { DeliveryMiniMap } from '../components/ui/DeliveryMiniMap';
import { generatePackageReport } from '../utils/generatePackageReport';
import type { Package, PackageFilters, PackageStatus } from '../types/package';

// ── Proof Image Modal ─────────────────────────────────────────────────────────
interface ProofModalProps {
  pkg: Package;
  onClose: () => void;
}

const ProofModal = ({ pkg, onClose }: ProofModalProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-surface-700">
        <p className="font-mono text-sm text-primary-400 font-bold">{pkg.tracking_number}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg transition-colors">✕</button>
      </div>

      {/* Proof photo */}
      {pkg.proof_image_url ? (
        <img
          src={pkg.proof_image_url}
          alt="Evidencia de entrega"
          className="w-full object-cover max-h-72"
        />
      ) : (
        <div className="h-36 flex items-center justify-center text-gray-500 text-sm">
          Sin foto registrada
        </div>
      )}

      {/* Proof details */}
      <div className="p-4 flex flex-col gap-2 text-sm">
        {pkg.proof_receiver_name && (
          <Row label="Receptor" value={pkg.proof_receiver_name} />
        )}
        {pkg.proof_receiver_ci && (
          <Row label="C.I." value={pkg.proof_receiver_ci} />
        )}
        {pkg.proof_created_at && (
          <Row label="Entregado el" value={new Date(pkg.proof_created_at).toLocaleString('es-BO')} />
        )}
        <Row label="Destino" value={pkg.destination_address} />
        {pkg.courier_name && <Row label="Repartidor" value={pkg.courier_name} />}
      </div>

      {/* Delivery GPS location */}
      {pkg.proof_delivery_point && (
        <div className="px-4 pb-4">
          <DeliveryMiniMap
            geoJson={pkg.proof_delivery_point}
            label="GPS confirmado al entregar"
          />
        </div>
      )}
    </div>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-2">
    <span className="text-gray-400 shrink-0">{label}:</span>
    <span className="text-gray-200 text-right">{value}</span>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
type CourierOption = { id: string; first_name: string; last_name: string };

const ALL_STATUSES: PackageStatus[] = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'];

export const PackageHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [filters, setFilters] = useState<PackageFilters>({});

  // Load courier list for admin filter
  useEffect(() => {
    if (!isAdmin) return;
    userService.getUsers('COURIER')
      .then(res => setCouriers(res.users as CourierOption[]))
      .catch(() => {}); // non-critical
  }, [isAdmin]);

  // Load packages whenever filters change
  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await packageService.getPackages(filters);
      setPackages(data.packages);
    } catch {
      setError('No se pudieron cargar los paquetes.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const setFilter = (key: keyof PackageFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => setFilters({});

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // ── PDF export ────────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (packages.length === 0) return;
    setIsExporting(true);
    try {
      const selectedCourier = filters.courier_id
        ? couriers.find(c => c.id === filters.courier_id)
        : undefined;

      generatePackageReport({
        packages,
        filters,
        courierName: selectedCourier
          ? `${selectedCourier.first_name} ${selectedCourier.last_name}`
          : undefined,
        generatedBy: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
      });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-900 pb-12">

      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-4 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Volver"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Historial de Paquetes</h1>
          <p className="text-xs text-gray-400">{isAdmin ? 'Vista de Administrador' : 'Mis paquetes'}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && packages.length > 0 && (
            <Button
              variant="outline"
              className="text-xs px-3 py-1 border-green-700 text-green-400 hover:border-green-500"
              isLoading={isExporting}
              onClick={handleExport}
            >
              📄 PDF
            </Button>
          )}
          <Button variant="outline" className="text-xs px-3 py-1" isLoading={isLoading} onClick={fetchPackages}>
            ↻
          </Button>
        </div>
      </header>

      {/* Filters panel */}
      <div className="bg-surface-800/60 border-b border-surface-700 px-4 py-3">
        <div className="max-w-lg mx-auto flex flex-col gap-3">

          {/* Row 1: Status + Courier (admin only) */}
          <div className="flex gap-2">
            <select
              value={filters.status ?? ''}
              onChange={e => setFilter('status', e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-surface-800 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Todos los estados</option>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>

            {isAdmin && (
              <select
                value={filters.courier_id ?? ''}
                onChange={e => setFilter('courier_id', e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-surface-800 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Todos los repartidores</option>
                {couriers.map(c => (
                  <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Row 2: Date range */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={filters.date_from ?? ''}
              onChange={e => setFilter('date_from', e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-surface-800 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 [color-scheme:dark]"
            />
            <span className="text-gray-500 text-sm shrink-0">al</span>
            <input
              type="date"
              value={filters.date_to ?? ''}
              onChange={e => setFilter('date_to', e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-surface-800 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-primary-500 [color-scheme:dark]"
            />
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="shrink-0 text-xs text-primary-400 hover:text-primary-300 transition-colors px-1"
              >
                Limpiar ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="p-4 max-w-lg mx-auto">
        {error && (
          <div className="bg-red-900/20 border border-red-900 text-danger text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner className="w-8 h-8 text-primary-500" />
            <p className="text-gray-400 text-sm">Cargando historial…</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">No se encontraron paquetes con los filtros seleccionados.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-3 text-xs text-primary-400 hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {packages.map(pkg => (
              <PackageHistoryCard
                key={pkg.id}
                pkg={pkg}
                onViewProof={() => setSelectedPkg(pkg)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Proof modal */}
      {selectedPkg && (
        <ProofModal pkg={selectedPkg} onClose={() => setSelectedPkg(null)} />
      )}
    </div>
  );
};

// ── Package row card ──────────────────────────────────────────────────────────
interface CardProps {
  pkg: Package;
  onViewProof: () => void;
}

const PackageHistoryCard = ({ pkg, onViewProof }: CardProps) => {
  const hasProof = Boolean(pkg.proof_id);

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold text-white truncate">{pkg.tracking_number}</p>
          {pkg.client_code && (
            <p className="text-xs text-primary-500/80 mt-0.5 truncate">
              🏷️ Ref. cliente: <span className="font-mono">{pkg.client_code}</span>
            </p>
          )}
          <p className="text-xs text-gray-500 mt-0.5 truncate">{pkg.destination_address}</p>
        </div>
        <Badge status={pkg.status} />
      </div>

      {/* Meta */}
      <div className="text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
        <span>👤 {pkg.customer_name}</span>
        {pkg.courier_name && <span>🚴 {pkg.courier_name}</span>}
        <span>📅 {new Date(pkg.created_at).toLocaleDateString('es-BO')}</span>
        <span>💵 Bs {Number(pkg.cash_to_collect).toFixed(2)}</span>
      </div>

      {/* Proof section */}
      {pkg.status === 'DELIVERED' && (
        <button
          onClick={onViewProof}
          className={`flex items-center gap-3 rounded-xl p-3 border transition-colors text-left w-full ${
            hasProof
              ? 'bg-green-900/20 border-green-800 hover:bg-green-900/30'
              : 'bg-surface-700/40 border-surface-600 opacity-60 cursor-default'
          }`}
          disabled={!hasProof}
        >
          {hasProof && pkg.proof_image_url ? (
            <img
              src={pkg.proof_image_url}
              alt="Prueba"
              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-green-800"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-surface-700 flex items-center justify-center shrink-0 text-xl">
              {hasProof ? '🖼️' : '❓'}
            </div>
          )}
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${hasProof ? 'text-green-400' : 'text-gray-500'}`}>
              {hasProof ? '✓ Entrega verificada' : 'Sin prueba registrada'}
            </p>
            {pkg.proof_receiver_name && (
              <p className="text-xs text-gray-300 truncate mt-0.5">Receptor: {pkg.proof_receiver_name}</p>
            )}
            {pkg.proof_created_at && (
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(pkg.proof_created_at).toLocaleString('es-BO')}
              </p>
            )}
            {hasProof && (
              <p className="text-xs text-primary-400 mt-1">Toca para ampliar →</p>
            )}
          </div>
        </button>
      )}
    </div>
  );
};
