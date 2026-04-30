import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { compressImage } from '../utils/imageCompressor';
import { uploadDeliveryProof } from '../services/supabase.service';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// ── Upload progress steps ─────────────────────────────────────────────────────
type UploadStep = 'idle' | 'gps' | 'compressing' | 'uploading' | 'saving';

const STEP_CONFIG: Record<UploadStep, { label: string; icon: string }> = {
  idle:        { label: 'Confirmar Entrega',       icon: '' },
  gps:         { label: 'Obteniendo GPS…',         icon: '📡' },
  compressing: { label: 'Comprimiendo imagen…',    icon: '🗜️' },
  uploading:   { label: 'Subiendo evidencia…',     icon: '☁️' },
  saving:      { label: 'Registrando entrega…',    icon: '💾' },
};

const ORDERED_STEPS: UploadStep[] = ['gps', 'compressing', 'uploading', 'saving'];

// ── Page Component ────────────────────────────────────────────────────────────
export const DeliverPackagePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchLocation } = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [receiverName, setReceiverName] = useState('');
  const [receiverCi, setReceiverCi]     = useState('');
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadStep, setUploadStep]     = useState<UploadStep>('idle');
  const [error, setError]               = useState<string | null>(null);

  const isSubmitting = uploadStep !== 'idle';

  // ── Photo selection ─────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous preview URL to avoid memory leaks
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // ── Form submission ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!receiverName.trim()) { setError('El nombre del receptor es requerido.'); return; }
    if (!receiverCi.trim())   { setError('La cédula de identidad es requerida.'); return; }
    if (!photoFile)            { setError('Debes tomar una foto como evidencia de la entrega.'); return; }

    try {
      // 1. Capture GPS coordinates
      setUploadStep('gps');
      const { latitude, longitude } = await fetchLocation();

      // 2. Compress image using Canvas API (no external library)
      setUploadStep('compressing');
      const compressedBlob = await compressImage(photoFile, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.75,
      });

      // 3. Upload compressed image to Supabase Storage
      setUploadStep('uploading');
      const image_url = await uploadDeliveryProof(id!, compressedBlob);

      // 4. POST delivery record to our backend (atomic transaction)
      setUploadStep('saving');
      await api.post(`/packages/${id}/deliver`, {
        receiver_name: receiverName.trim(),
        receiver_ci:   receiverCi.trim(),
        image_url,
        latitude,
        longitude,
      });

      navigate('/dashboard', { replace: true });

    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Error inesperado al registrar la entrega.');
    } finally {
      setUploadStep('idle');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-900 flex flex-col pb-10">

      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-4 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          disabled={isSubmitting}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-40"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-white">Registrar Entrega</h1>
      </header>

      <main className="flex-1 p-4 max-w-sm mx-auto w-full flex flex-col gap-5 justify-center">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Receiver info */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col">
            <Input
              label="Nombre completo del receptor *"
              value={receiverName}
              onChange={e => setReceiverName(e.target.value)}
              placeholder="Juan Pérez López"
              autoComplete="off"
              disabled={isSubmitting}
            />
            <Input
              label="Cédula de Identidad (C.I.) *"
              value={receiverCi}
              onChange={e => setReceiverCi(e.target.value)}
              placeholder="1234567 CB"
              autoComplete="off"
              disabled={isSubmitting}
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
                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80 transition-colors"
                    aria-label="Eliminar foto"
                  >
                    ✕
                  </button>
                )}
                <div className="px-3 py-2 bg-green-900/40 border-t border-green-800">
                  <p className="text-xs text-green-400 font-medium">✓ Foto capturada</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="w-full h-44 flex flex-col items-center justify-center gap-3 text-gray-400 hover:bg-surface-700 transition-colors disabled:opacity-50"
              >
                <span className="text-4xl">📷</span>
                <span className="text-sm font-medium">Tomar foto de evidencia</span>
                <span className="text-xs text-gray-500">Toca para abrir la cámara trasera</span>
              </button>
            )}
            {/* capture="environment" = rear camera on mobile */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Progress tracker — only visible while submitting */}
          {isSubmitting && (
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-3 font-medium">Progreso de la entrega</p>
              <div className="flex flex-col gap-2.5">
                {ORDERED_STEPS.map((step) => {
                  const currentIdx = ORDERED_STEPS.indexOf(uploadStep);
                  const stepIdx    = ORDERED_STEPS.indexOf(step);
                  const isDone     = stepIdx < currentIdx;
                  const isCurrent  = step === uploadStep;

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <span className={`text-sm w-4 text-center transition-colors ${
                        isDone    ? 'text-green-400' :
                        isCurrent ? 'text-primary-400 animate-pulse' :
                                    'text-surface-600'
                      }`}>
                        {isDone ? '✓' : isCurrent ? STEP_CONFIG[step].icon : '○'}
                      </span>
                      <span className={`text-sm transition-colors ${
                        isDone    ? 'text-green-400' :
                        isCurrent ? 'text-white font-medium' :
                                    'text-surface-600'
                      }`}>
                        {STEP_CONFIG[step].label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hint — only when idle */}
          {!isSubmitting && (
            <p className="text-xs text-gray-500 text-center px-2">
              📡 Al confirmar se capturará tu GPS y se subirá la foto como evidencia oficial.
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-danger text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="mt-1 py-3 text-base font-semibold"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {STEP_CONFIG[uploadStep].label}
          </Button>

        </form>
      </main>
    </div>
  );
};
