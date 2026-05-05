import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
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

// ── Types ─────────────────────────────────────────────────────────────────────
type UserOption = { id: string; first_name: string; last_name: string };

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// La Paz, Bolivia as default center
const INITIAL_CENTER: [number, number] = [-16.5, -68.15];
const INITIAL_ZOOM = 13;

// ── MapFlyTo: programmatically fly the map to a location ─────────────────────
// Must be rendered inside <MapContainer>. Reads `target` and flies there.
interface MapFlyToProps {
  target: [number, number] | null;
}
const MapFlyTo = ({ target }: MapFlyToProps) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 1.2 });
  }, [target, map]);
  return null;
};

// ── LocationPicker: handles map click → places/moves the pin ─────────────────
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

// ── Nominatim search hook ─────────────────────────────────────────────────────
// Rate-limit: 1 request per second (Nominatim ToS). We debounce to 600ms.
function useNominatimSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          q: `${q}, Bolivia`,   // Bias results toward Bolivia
          format: 'json',
          limit: '5',
          addressdetails: '0',
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { query, results, isSearching, search, clear };
}

// ── Main page ─────────────────────────────────────────────────────────────────
export const CreatePackagePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect non-admins immediately
  useEffect(() => {
    if (user && user.role !== 'ADMIN') navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const [customers, setCustomers] = useState<UserOption[]>([]);
  const [couriers, setCouriers]   = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [submitDetails, setSubmitDetails]   = useState<{ field: string; message: string }[]>([]);
  const [pinPosition, setPinPosition]       = useState<[number, number] | null>(null);

  // The map flyTo target — set when user picks a search result
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const { query, results, isSearching, search, clear } = useNominatimSearch();
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    customer_id: '',
    courier_id: '',
    client_code: '',
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
      } catch {
        setUsersError('No se pudo cargar la lista de clientes y repartidores. ¿Está el servidor activo?');
      } finally {
        setIsLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Called when user picks a Nominatim suggestion
  const handleSelectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setFlyTarget([lat, lng]);   // fly map to location (no pin placed)
    setShowDropdown(false);
    clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitDetails([]);

    if (!form.customer_id) { setSubmitError('Selecciona un cliente.'); return; }
    if (form.destination_address.trim().length < 5) { setSubmitError('La dirección de destino debe tener al menos 5 caracteres.'); return; }
    if (!pinPosition) { setSubmitError('Toca el mapa para fijar el punto de entrega.'); return; }

    const locationRef = form.location_reference.trim().length >= 3
      ? form.location_reference.trim()
      : 'Sin referencia específica';

    setIsSubmitting(true);
    try {
      await api.post('/packages', {
        customer_id: form.customer_id,
        ...(form.courier_id   ? { courier_id:   form.courier_id.trim()   } : {}),
        ...(form.client_code.trim() ? { client_code: form.client_code.trim() } : {}),
        destination_address: form.destination_address.trim(),
        location_reference: locationRef,
        latitude: pinPosition[0],
        longitude: pinPosition[1],
        cash_to_collect: parseFloat(form.cash_to_collect) || 0,
      });
      navigate('/dashboard');
    } catch (err: any) {
      const data = err.response?.data;
      setSubmitError(data?.message || 'Error al crear el paquete.');
      if (Array.isArray(data?.errors)) setSubmitDetails(data.errors);
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

          {/* Client code */}
          <Input
            label="Código del cliente (opcional)"
            name="client_code"
            placeholder="ORD-001, PEDIDO-445…"
            value={form.client_code}
            onChange={handleField}
          />

          <Input
            label="Dirección de destino *"
            name="destination_address"
            required
            placeholder="Av. Camacho y Loayza, La Paz"
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

          {/* Map section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">
              Ubicación exacta *{' '}
              <span className="text-gray-500 font-normal">(toca el mapa para fijar el pin)</span>
            </label>

            {/* ── Address search bar ─────────────────────────────────────── */}
            <div ref={searchRef} className="relative z-[200]">
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg focus-within:ring-1 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                <span className="text-gray-400 text-sm shrink-0">
                  {isSearching ? '⟳' : '🔍'}
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={e => {
                    search(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  placeholder="Buscar lugar de referencia (plaza, avenida…)"
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={clear}
                    className="text-gray-500 hover:text-white text-sm transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Results dropdown */}
              {showDropdown && results.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-surface-700 border border-surface-600 rounded-lg shadow-2xl overflow-hidden">
                  {results.map(r => (
                    <li key={r.place_id}>
                      <button
                        type="button"
                        onClick={() => handleSelectResult(r)}
                        className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-surface-600 hover:text-white transition-colors border-b border-surface-600 last:border-0 leading-snug"
                      >
                        <span className="text-primary-400 mr-2">📍</span>
                        {r.display_name}
                      </button>
                    </li>
                  ))}
                  <li className="px-4 py-1.5 text-xs text-gray-600 bg-surface-800">
                    © OpenStreetMap contributors
                  </li>
                </ul>
              )}

              {showDropdown && !isSearching && query.length >= 3 && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-700 border border-surface-600 rounded-lg shadow-xl px-4 py-3 text-sm text-gray-500">
                  Sin resultados para "{query}"
                </div>
              )}
            </div>

            {/* ── Map ─────────────────────────────────────────────────────── */}
            <div className="h-60 rounded-xl overflow-hidden border border-surface-600 relative z-0">
              <MapContainer
                center={INITIAL_CENTER}
                zoom={INITIAL_ZOOM}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* Flies to search result without placing a pin */}
                <MapFlyTo target={flyTarget} />
                {/* Places/moves pin on click */}
                <LocationPicker
                  onLocationSelect={(lat, lng) => setPinPosition([lat, lng])}
                  position={pinPosition}
                />
              </MapContainer>
            </div>

            {pinPosition ? (
              <p className="text-xs text-primary-400">
                📍 Pin: {pinPosition[0].toFixed(5)}, {pinPosition[1].toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Sin ubicación seleccionada. Toca el mapa.</p>
            )}
          </div>

          {/* Error display */}
          {submitError && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-danger text-sm font-medium">{submitError}</p>
              {submitDetails.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {submitDetails.map((d, i) => (
                    <li key={i} className="text-xs text-red-300">
                      <span className="font-mono text-red-400">{d.field}:</span> {d.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {usersError && (
            <div className="bg-yellow-900/20 border border-yellow-800 text-yellow-300 text-xs rounded-lg p-3">
              ⚠️ {usersError}
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
