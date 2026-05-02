import { useState } from 'react';
import { packageService } from '../services/package.service';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { PublicTrackingResult } from '../types/package';

// Timeline of states in order
const STATUS_TIMELINE = [
  { status: 'PENDING',    label: 'Registrado',       icon: '📦' },
  { status: 'PICKED_UP',  label: 'Recogido',         icon: '🤝' },
  { status: 'IN_TRANSIT', label: 'En Tránsito',      icon: '🚴' },
  { status: 'DELIVERED',  label: 'Entregado',        icon: '✅' },
] as const;

const FAILED_STATUSES = ['FAILED', 'CANCELLED'];

export const PublicTrackingPage = () => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<PublicTrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProof, setShowProof] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setResult(null);
    setShowProof(false);
    setIsLoading(true);
    try {
      const res = await packageService.trackByCode(code);
      setResult(res.package);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        setError('No se encontró ningún paquete con ese código. Verifica que esté escrito correctamente.');
      } else {
        setError('Error al consultar el estado. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFailed = result ? FAILED_STATUSES.includes(result.status) : false;
  const currentStepIndex = result
    ? STATUS_TIMELINE.findIndex(s => s.status === result.status)
    : -1;

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center px-4 py-10">

      {/* Title */}
      <div className="w-full max-w-sm text-center mb-8">
        <div className="text-5xl mb-4">📦</div>
        <h1 className="text-2xl font-bold text-white">Rastrear Paquete</h1>
        <p className="text-gray-400 text-sm mt-2">
          Ingresa tu código de seguimiento para ver el estado de tu envío.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Ej: CR-20260416-ABC12"
          className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all uppercase tracking-widest"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <Button type="submit" isLoading={isLoading} className="py-3 font-semibold">
          Buscar
        </Button>
      </form>

      {/* Error */}
      {error && (
        <div className="w-full max-w-sm mt-5 bg-red-900/20 border border-red-800 text-danger text-sm rounded-xl p-4 text-center">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="w-full max-w-sm mt-6 flex flex-col gap-4">

          {/* Status badge */}
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
            <Badge status={result.status} />
            <p className="text-white font-bold text-lg">{result.tracking_number}</p>
            <p className="text-gray-400 text-sm">{result.destination_address}</p>
            {result.location_reference && (
              <p className="text-gray-500 text-xs">📌 {result.location_reference}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Registrado el {new Date(result.created_at).toLocaleDateString('es-BO')}
            </p>
          </div>

          {/* Timeline */}
          {!isFailed && (
            <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-4">Estado del envío</p>
              <div className="flex flex-col gap-0">
                {STATUS_TIMELINE.map((step, idx) => {
                  const isDone    = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const isLast    = idx === STATUS_TIMELINE.length - 1;

                  return (
                    <div key={step.status} className="flex gap-3">
                      {/* Connector column */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                          isDone
                            ? 'bg-primary-700 border-primary-500 text-white'
                            : 'bg-surface-700 border-surface-600 text-gray-600'
                        }`}>
                          {step.icon}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 h-6 my-0.5 ${isDone && idx < currentStepIndex ? 'bg-primary-600' : 'bg-surface-600'}`} />
                        )}
                      </div>
                      {/* Label */}
                      <div className="pt-1 pb-4">
                        <p className={`text-sm font-medium ${isCurrent ? 'text-primary-400' : isDone ? 'text-white' : 'text-gray-600'}`}>
                          {step.label}
                          {isCurrent && <span className="ml-2 text-xs animate-pulse">● Ahora</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div className="bg-red-900/20 border border-red-800 rounded-2xl p-4 text-center">
              <p className="text-red-300 font-semibold text-sm">
                {result.status === 'CANCELLED' ? '❌ Envío cancelado' : '⚠️ Entrega fallida'}
              </p>
              <p className="text-red-400/70 text-xs mt-1">
                Contacta a la empresa courier para más información.
              </p>
            </div>
          )}

          {/* Delivery proof */}
          {result.status === 'DELIVERED' && result.proof_image_url && (
            <div className="bg-surface-800 border border-green-900 rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-green-400 font-semibold text-sm">✓ Prueba de entrega</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProof(v => !v)}
                className="w-full text-left"
              >
                {showProof ? (
                  <img
                    src={result.proof_image_url}
                    alt="Prueba de entrega"
                    className="w-full object-cover max-h-64"
                  />
                ) : (
                  <div className="mx-4 mb-4 h-20 bg-green-900/20 border border-green-800 rounded-xl flex items-center justify-center gap-2 text-green-400 text-sm hover:bg-green-900/30 transition-colors">
                    <span>🖼️</span>
                    <span>Toca para ver la foto de entrega</span>
                  </div>
                )}
              </button>
              <div className="px-4 pb-4 flex flex-col gap-1.5 text-sm">
                {result.proof_receiver_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recibido por:</span>
                    <span className="text-gray-200">{result.proof_receiver_name}</span>
                  </div>
                )}
                {result.proof_created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha:</span>
                    <span className="text-gray-200">{new Date(result.proof_created_at).toLocaleString('es-BO')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
