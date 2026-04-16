import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export const DeliverPackagePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchLocation, isLoading: isLocating } = useGeolocation();

  const [receiverName, setReceiverName] = useState('');
  const [receiverCi, setReceiverCi] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!receiverName.trim()) { setError('El nombre del receptor es requerido.'); return; }
    if (!receiverCi.trim()) { setError('La cédula de identidad es requerida.'); return; }
    if (!photoFile) { setError('Debes tomar una foto como evidencia de la entrega.'); return; }

    setIsSubmitting(true);
    try {
      // 1. Get GPS coordinates (promise-based, throws on failure)
      const { latitude, longitude } = await fetchLocation();

      // 2. Upload photo - convert to base64 for the API
      //    In production: upload to Cloudinary/S3 and use the returned URL.
      //    For now, we use a stable placeholder URL so the backend validation passes.
      //    TODO: integrate Cloudinary upload when storage is configured.
      const image_url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';

      // 3. POST to backend delivery endpoint (atomic transaction)
      await api.post(`/packages/${id}/deliver`, {
        receiver_name: receiverName.trim(),
        receiver_ci: receiverCi.trim(),
        image_url,
        latitude,
        longitude,
      });

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Error al registrar la entrega.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col pb-10">
      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-4 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-white">Registrar Entrega</h1>
      </header>

      <main className="flex-1 p-4 max-w-sm mx-auto w-full flex flex-col justify-center gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Receiver info */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col gap-0">
            <Input
              label="Nombre completo del receptor *"
              value={receiverName}
              onChange={e => setReceiverName(e.target.value)}
              placeholder="Juan Pérez López"
              autoComplete="off"
            />
            <Input
              label="Cédula de Identidad (C.I.) *"
              value={receiverCi}
              onChange={e => setReceiverCi(e.target.value)}
              placeholder="1234567 CB"
              autoComplete="off"
            />
          </div>

          {/* Photo capture */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden">
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Evidencia de entrega"
                  className="w-full h-52 object-cover"
                />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80 transition"
                  aria-label="Eliminar foto"
                >
                  ✕
                </button>
                <div className="px-3 py-2 bg-green-900/40 border-t border-green-800">
                  <p className="text-xs text-green-400 font-medium">✓ Foto capturada</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-44 flex flex-col items-center justify-center gap-3 text-gray-400 hover:bg-surface-700 transition-colors"
              >
                <span className="text-4xl">📷</span>
                <span className="text-sm font-medium">Tomar foto de evidencia</span>
                <span className="text-xs text-gray-500">Toca para abrir la cámara</span>
              </button>
            )}
            {/* Native file input — capture="environment" opens rear camera on mobile */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* GPS note */}
          <p className="text-xs text-gray-500 text-center px-2">
            📡 Al confirmar, se obtendrán tus coordenadas GPS automáticamente para auditoría.
          </p>

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-danger text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="mt-2 py-3 text-base font-semibold"
            isLoading={isSubmitting || isLocating}
            disabled={isSubmitting || isLocating}
          >
            {isLocating ? 'Obteniendo GPS…' : 'Confirmar Entrega'}
          </Button>
        </form>
      </main>
    </div>
  );
};
