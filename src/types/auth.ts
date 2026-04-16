export type UserRole = 'ADMIN' | 'COURIER' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  company_id: string;
}

export interface LoginResponse {
  status: string;
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
