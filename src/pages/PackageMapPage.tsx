import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { packageService } from '../services/package.service';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import type { Package } from '../types/package';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Parse GeoJSON point string → [lat, lng] for Leaflet
function parseGeoJsonPoint(geojson: string): [number, number] | null {
  try {
    const parsed = JSON.parse(geojson);
    if (parsed?.type === 'Point' && Array.isArray(parsed.coordinates)) {
      const [lng, lat] = parsed.coordinates; // GeoJSON = [lng, lat], Leaflet = [lat, lng]
      return [lat, lng];
    }
    return null;
  } catch {
    return null;
  }
}

export const PackageMapPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await packageService.getPackages();
        const found = res.packages.find(p => p.id === id) ?? null;
        if (!found) setNotFound(true);
        else setPkg(found);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <Spinner className="w-10 h-10 text-primary-500" />
      </div>
    );
  }

  if (notFound || !pkg) {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-gray-400">Paquete no encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>Volver</Button>
      </div>
    );
  }

  const coords = parseGeoJsonPoint(pkg.destination_point);
  const canDeliver = pkg.status === 'IN_TRANSIT';

  return (
    <div className="h-screen bg-surface-900 flex flex-col">
      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-3 z-[100] flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors text-lg"
          aria-label="Volver"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-mono">{pkg.tracking_number}</p>
          <p className="text-sm text-white font-medium truncate">{pkg.destination_address}</p>
        </div>
        <Badge status={pkg.status} />
      </header>

      {/* Map — takes remaining height */}
      <div className="flex-1 relative z-0">
        {coords ? (
          <MapContainer
            center={coords}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={coords}>
              <Popup>
                <div className="text-sm font-bold text-gray-800">{pkg.destination_address}</div>
                {pkg.location_reference && (
                  <div className="text-xs text-gray-600 mt-1">{pkg.location_reference}</div>
                )}
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No hay coordenadas disponibles para este paquete.
          </div>
        )}
      </div>

      {/* Bottom CTA for courier when IN_TRANSIT */}
      {canDeliver && (
        <div className="absolute bottom-0 left-0 right-0 z-[100] p-4 bg-surface-800/90 backdrop-blur border-t border-surface-700 shadow-[0_-8px_20px_rgba(0,0,0,0.4)]">
          <Button
            className="w-full py-3 text-base font-semibold"
            onClick={() => navigate(`/packages/${pkg.id}/deliver`)}
          >
            ✅ He llegado al destino — Registrar Entrega
          </Button>
        </div>
      )}
    </div>
  );
};
