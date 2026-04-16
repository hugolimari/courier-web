import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/user.service';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// Fix Leaflet's default icon paths broken by Vite's bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ── Inline map click handler ──────────────────────────────────────────────────
interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  position: [number, number] | null;
}

const LocationPicker = ({ onLocationSelect, position }: LocationPickerProps) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return position ? <Marker position={position} /> : null;
};

// ── Main page ─────────────────────────────────────────────────────────────────
type UserOption = { id: string; first_name: string; last_name: string };

// Cochabamba, Bolivia as initial center
const INITIAL_CENTER: [number, number] = [-17.3895, -66.1568];

export const CreatePackagePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect non-admins immediately
  useEffect(() => {
    if (user && user.role !== 'ADMIN') navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const [customers, setCustomers] = useState<UserOption[]>([]);
  const [couriers, setCouriers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null);

  const [form, setForm] = useState({
    customer_id: '',
    courier_id: '',
    destination_address: '',
    location_reference: '',
    cash_to_collect: '',
  });

  // Load customers and couriers in parallel
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const [custRes, courRes] = await Promise.all([
          userService.getUsers('CUSTOMER'),
          userService.getUsers('COURIER'),
        ]);
        setCustomers(custRes.users as UserOption[]);
        setCouriers(courRes.users as UserOption[]);
      } catch (err) {
        console.error('Failed to load users', err);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!form.customer_id) { setSubmitError('Selecciona un cliente.'); return; }
    if (!pinPosition) { setSubmitError('Toca el mapa para fijar el punto de entrega.'); return; }

    setIsSubmitting(true);
    try {
      await api.post('/packages', {
        customer_id: form.customer_id,
        courier_id: form.courier_id || undefined,
        destination_address: form.destination_address,
        location_reference: form.location_reference || 'Sin referencia',
        latitude: pinPosition[0],
        longitude: pinPosition[1],
        cash_to_collect: Number(form.cash_to_collect) || 0,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Error al crear el paquete.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUsers) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <p className="text-gray-400">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 pb-12">
      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-4 sticky top-0 z-[100] shadow-sm flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-white">Nuevo Envío</h1>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Customer select */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Cliente (Remitente) *</label>
            <select
              name="customer_id"
              required
              value={form.customer_id}
              onChange={handleField}
              className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="" disabled>Selecciona un cliente…</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          {/* Courier select */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Repartidor (opcional)</label>
            <select
              name="courier_id"
              value={form.courier_id}
              onChange={handleField}
              className="px-3 py-2 bg-surface-800 border border-surface-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Sin asignar</option>
              {couriers.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Dirección de destino *"
            name="destination_address"
            required
            placeholder="Av. América y Libertador, Cochabamba"
            value={form.destination_address}
            onChange={handleField}
          />

          <Input
            label="Referencia (opcional)"
            name="location_reference"
            placeholder="Puerta azul, llamar al llegar…"
            value={form.location_reference}
            onChange={handleField}
          />

          <Input
            label="Monto a cobrar (Bs)"
            name="cash_to_collect"
            type="number"
            min="0"
            step="0.5"
            placeholder="0"
            value={form.cash_to_collect}
            onChange={handleField}
          />

          {/* Map pin picker */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">
              Ubicación exacta *{' '}
              <span className="text-gray-500 font-normal">(toca el mapa para fijar el pin)</span>
            </label>
            <div className="h-60 rounded-xl overflow-hidden border border-surface-600 relative z-0">
              <MapContainer
                center={INITIAL_CENTER}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker onLocationSelect={(lat, lng) => setPinPosition([lat, lng])} position={pinPosition} />
              </MapContainer>
            </div>
            {pinPosition ? (
              <p className="text-xs text-primary-400 mt-1">
                📍 Lat: {pinPosition[0].toFixed(5)}, Lng: {pinPosition[1].toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Sin ubicación seleccionada.</p>
            )}
          </div>

          {submitError && (
            <div className="bg-red-900/20 border border-red-800 text-danger text-sm rounded-lg p-3">
              {submitError}
            </div>
          )}

          <Button type="submit" isLoading={isSubmitting} className="mt-2 py-3">
            Crear y Asignar Paquete
          </Button>
        </form>
      </main>
    </div>
  );
};
