import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { PackageCard } from '../components/packages/PackageCard';
import { packageService } from '../services/package.service';
import type { Package, PackageStatus } from '../types/package';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetching all packages (no filter applied currently based on V1 requirements)
      const data = await packageService.getPackages();
      setPackages(data.packages);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los paquetes. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: PackageStatus) => {
    try {
      if (newStatus === 'DELIVERED') {
         // TODO: Implement Deliver flow with proof images and GPS
         alert("El flujo de entrega final requerirá fotos. Esto se construirá en el siguiente paso.");
         return;
      }
      await packageService.updatePackageStatus(id, newStatus);
      // Optimistically update the UI instead of a full reload
      setPackages(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (err) {
      console.error('Error updating status', err);
      alert('Error al actualizar estado. Revisa tu conexión.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 pb-12">
      {/* Navbar Minimalista */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-white">Courier App</h1>
          <p className="text-xs text-gray-400 capitalize">{user?.role} - {user?.first_name}</p>
        </div>
        <Button variant="outline" className="text-xs px-3 py-1" onClick={logout}>
          Salir
        </Button>
      </header>

      {/* Main Feed */}
      <main className="p-4 max-w-lg mx-auto">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Paquetes</h2>
          <Button variant="outline" onClick={fetchPackages} isLoading={isLoading} className="text-xs px-3 py-1">
            Refrescar
          </Button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-900 text-danger text-sm rounded p-3 mb-4">
            {error}
          </div>
        )}

        {isLoading && packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="w-8 h-8 text-primary-500 mb-4" />
            <p className="text-gray-400 text-sm">Cargando paquetes...</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-8 text-center text-gray-400">
            No hay paquetes para mostrar.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {packages.map(pkg => (
              <PackageCard 
                key={pkg.id} 
                pkg={pkg} 
                onUpdateStatus={handleUpdateStatus} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
