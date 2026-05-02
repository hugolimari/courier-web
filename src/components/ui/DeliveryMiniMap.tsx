import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// ── Custom pin icon (green to distinguish from destination pin) ───────────────
const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface DeliveryMiniMapProps {
  /** GeoJSON Point string from PostGIS ST_AsGeoJSON() */
  geoJson: string;
  label?: string;
  className?: string;
}

/**
 * Renders a small, non-interactive Leaflet map centered on a PostGIS GEOGRAPHY(POINT).
 * Parses the GeoJSON string returned by ST_AsGeoJSON() which is in [longitude, latitude] order.
 * Uses a green marker to distinguish "delivery happened here" from other pins.
 */
export const DeliveryMiniMap = ({ geoJson, label = 'Punto de entrega', className = '' }: DeliveryMiniMapProps) => {
  const position = useMemo<[number, number] | null>(() => {
    try {
      const parsed = JSON.parse(geoJson);
      // GeoJSON coordinates are [longitude, latitude] — Leaflet needs [lat, lng]
      const [lng, lat] = parsed.coordinates as [number, number];
      if (isNaN(lat) || isNaN(lng)) return null;
      return [lat, lng];
    } catch {
      return null;
    }
  }, [geoJson]);

  if (!position) return null;

  return (
    <div className={`rounded-xl overflow-hidden border border-green-800 ${className}`}>
      <MapContainer
        center={position}
        zoom={16}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        attributionControl={false}
        style={{ height: '160px', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position} icon={deliveryIcon}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
      <div className="bg-green-900/30 px-3 py-1.5 flex items-center gap-2">
        <span className="text-green-400 text-xs">📍</span>
        <span className="text-green-300 text-xs font-medium">{label}</span>
        <span className="text-green-500 text-xs ml-auto">
          {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </span>
      </div>
    </div>
  );
};
