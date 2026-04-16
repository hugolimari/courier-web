import { useState } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  isLoading: boolean;
}

export const useGeolocation = () => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    isLoading: false,
  });

  const fetchLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const msg = 'La geolocalización no está soportada por este navegador.';
        setState(prev => ({ ...prev, error: msg }));
        reject(new Error(msg));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setState({ latitude, longitude, error: null, isLoading: false });
          resolve({ latitude, longitude });
        },
        (err) => {
          const msg = `Error de GPS: ${err.message}`;
          setState({ latitude: null, longitude: null, error: msg, isLoading: false });
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  return { ...state, fetchLocation };
};
