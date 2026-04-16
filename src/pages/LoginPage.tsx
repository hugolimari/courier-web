import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.status === 'success') {
        login(response.data);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Ocurrió un error inesperado al iniciar sesión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-900">
      <div className="w-full max-w-sm bg-surface-800 p-8 rounded-xl shadow-lg border border-surface-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Courier Login</h1>
          <p className="text-gray-400 text-sm mt-2">Ingresa a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <Input 
            label="Email" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hugo@courier.bo"
            required
            autoComplete="email"
          />

          <Input 
            label="Contraseña" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="mb-4 text-sm text-danger font-medium bg-red-900/20 px-3 py-2 rounded border border-red-900">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full mt-2" 
            isLoading={isLoading}
          >
            Iniciar Sesión
          </Button>
        </form>
      </div>
    </div>
  );
};
