import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, type UserRecord, type CreateUserPayload } from '../services/user.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'COURIER' | 'CUSTOMER' | 'ADMIN';

const TAB_LABELS: Record<Tab, string> = {
  COURIER:  '🚴 Repartidores',
  CUSTOMER: '👤 Clientes',
  ADMIN:    '🛡️ Administradores',
};

const ROLE_LABELS: Record<Tab, string> = {
  COURIER:  'Repartidor',
  CUSTOMER: 'Cliente',
  ADMIN:    'Administrador',
};

// ── Create User Modal ─────────────────────────────────────────────────────────
interface CreateModalProps {
  role: Tab;
  onClose: () => void;
  onCreated: (user: UserRecord) => void;
}

const EMPTY_FORM: CreateUserPayload = {
  first_name: '', middle_name: '', last_name: '', second_last_name: '',
  email: '', password: '', phone_number: '', role: 'COURIER',
};

const CreateUserModal = ({ role, onClose, onCreated }: CreateModalProps) => {
  const [form, setForm] = useState<CreateUserPayload>({ ...EMPTY_FORM, role });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await userService.createUser({
        ...form,
        middle_name:      form.middle_name      || undefined,
        second_last_name: form.second_last_name || undefined,
      });
      onCreated(res.user);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear el usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-surface-700">
          <h2 className="text-white font-bold">Nuevo {ROLE_LABELS[role]}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" name="first_name" value={form.first_name} onChange={handleField} placeholder="Juan" required />
            <Input label="Segundo nombre" name="middle_name" value={form.middle_name} onChange={handleField} placeholder="Carlos" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Apellido *" name="last_name" value={form.last_name} onChange={handleField} placeholder="Pérez" required />
            <Input label="Segundo apellido" name="second_last_name" value={form.second_last_name} onChange={handleField} placeholder="López" />
          </div>
          <Input label="Correo electrónico *" name="email" type="email" value={form.email} onChange={handleField} placeholder="correo@empresa.bo" required />
          <Input label="Teléfono *" name="phone_number" value={form.phone_number} onChange={handleField} placeholder="70012345" required />
          <Input label="Contraseña inicial *" name="password" type="password" value={form.password} onChange={handleField} placeholder="Mínimo 8 caracteres" required />

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-danger text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" isLoading={isLoading}>
              Crear
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Edit User Modal ───────────────────────────────────────────────────────────
interface EditModalProps {
  user: UserRecord;
  onClose: () => void;
  onUpdated: (user: UserRecord) => void;
}

const EditUserModal = ({ user, onClose, onUpdated }: EditModalProps) => {
  const [form, setForm] = useState({
    first_name:       user.first_name,
    middle_name:      user.middle_name      ?? '',
    last_name:        user.last_name,
    second_last_name: user.second_last_name ?? '',
    phone_number:     user.phone_number,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await userService.updateUser(user.id, {
        first_name:       form.first_name,
        middle_name:      form.middle_name      || null,
        last_name:        form.last_name,
        phone_number:     form.phone_number,
      });
      onUpdated(res.user);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al actualizar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-800 border border-surface-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 pt-5 pb-3 border-b border-surface-700">
          <h2 className="text-white font-bold">Editar usuario</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" name="first_name" value={form.first_name} onChange={handleField} required />
            <Input label="Segundo nombre" name="middle_name" value={form.middle_name} onChange={handleField} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Apellido *" name="last_name" value={form.last_name} onChange={handleField} required />
            <Input label="Segundo apellido" name="second_last_name" value={form.second_last_name} onChange={handleField} />
          </div>
          <Input label="Teléfono *" name="phone_number" value={form.phone_number} onChange={handleField} required />
          <p className="text-xs text-gray-500">El correo y el rol no son editables.</p>

          {error && <div className="bg-red-900/20 border border-red-800 text-danger text-sm rounded-lg p-3">{error}</div>}

          <div className="flex gap-3 mt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1" isLoading={isLoading}>Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── User Row Card ─────────────────────────────────────────────────────────────
interface UserCardProps {
  user: UserRecord;
  onEdit: () => void;
  onToggleActive: () => void;
  isToggling: boolean;
}

const UserCard = ({ user, onEdit, onToggleActive, isToggling }: UserCardProps) => {
  const fullName = [user.first_name, user.middle_name, user.last_name, user.second_last_name]
    .filter(Boolean).join(' ');

  return (
    <div className={`bg-surface-800 border rounded-xl p-4 flex flex-col gap-2 transition-opacity ${
      user.is_active ? 'border-surface-700' : 'border-surface-700 opacity-50'
    }`}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{fullName}</p>
          <p className="text-gray-400 text-xs truncate">{user.email}</p>
          <p className="text-gray-500 text-xs">{user.phone_number}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
          user.is_active
            ? 'bg-green-900/30 text-green-400 border border-green-800'
            : 'bg-surface-700 text-gray-500 border border-surface-600'
        }`}>
          {user.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="flex gap-2 mt-1">
        {user.is_active && (
          <Button variant="outline" className="flex-1 text-xs py-1.5" onClick={onEdit}>
            ✏️ Editar
          </Button>
        )}
        <Button
          variant={user.is_active ? 'danger' : 'outline'}
          className="flex-1 text-xs py-1.5"
          isLoading={isToggling}
          onClick={onToggleActive}
        >
          {user.is_active ? 'Desactivar' : '↩ Reactivar'}
        </Button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const ManageUsersPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('COURIER');
  const [users, setUsers]         = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [togglingId, setTogglingId]   = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await userService.getUsers(activeTab);
      setUsers(res.users);
    } catch {
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreated = (user: UserRecord) => {
    setUsers(prev => [user, ...prev]);
  };

  const handleUpdated = (updated: UserRecord) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  const handleToggleActive = async (user: UserRecord) => {
    setTogglingId(user.id);
    try {
      if (user.is_active) {
        await userService.deactivateUser(user.id);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: false } : u));
      } else {
        await userService.activateUser(user.id);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: true } : u));
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al cambiar el estado del usuario.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 pb-12">

      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-4 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white transition-colors" aria-label="Volver">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-xs text-gray-400">Solo el administrador puede crear y gestionar usuarios</p>
        </div>
        <Button className="text-xs px-3 py-1.5" onClick={() => setShowCreate(true)}>
          + Nuevo {ROLE_LABELS[activeTab]}
        </Button>
      </header>

      {/* Tab bar */}
      <div className="bg-surface-800/60 border-b border-surface-700 px-4">
        <div className="max-w-lg mx-auto flex">
          {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-primary-400 border-primary-500'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-4 max-w-lg mx-auto">
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-danger text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner className="w-8 h-8 text-primary-500" />
            <p className="text-gray-400 text-sm">Cargando…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm mb-3">No hay {ROLE_LABELS[activeTab].toLowerCase()}s registrados.</p>
            <Button className="text-sm" onClick={() => setShowCreate(true)}>
              + Crear {ROLE_LABELS[activeTab]}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map(u => (
              <UserCard
                key={u.id}
                user={u}
                onEdit={() => setEditingUser(u)}
                onToggleActive={() => handleToggleActive(u)}
                isToggling={togglingId === u.id}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <CreateUserModal
          role={activeTab}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Edit modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
};
