import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

export const DashboardPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen p-6 bg-surface-900 flex flex-col items-center">
      <div className="w-full max-w-md bg-surface-800 p-6 rounded-xl shadow border border-surface-700 mt-10">
        <h1 className="text-2xl font-bold text-white mb-2">Bienvenido</h1>
        
        <div className="bg-surface-700 rounded-lg p-4 mb-6">
          <p className="text-gray-300 text-sm">Nombre: <span className="text-white font-medium">{user?.first_name} {user?.last_name}</span></p>
          <p className="text-gray-300 text-sm">Email: <span className="text-white font-medium">{user?.email}</span></p>
          <p className="text-gray-300 text-sm">Rol: <span className="inline-block mt-1 px-2 py-1 bg-primary-600 rounded text-xs font-bold">{user?.role}</span></p>
        </div>

        <Button variant="danger" className="w-full" onClick={logout}>
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};
