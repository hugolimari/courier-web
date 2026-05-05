import api from './api';

export interface UserRecord {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  second_last_name: string | null;
  email: string;
  role: 'ADMIN' | 'COURIER' | 'CUSTOMER';
  phone_number: string;
  is_active: boolean;
  created_at: string;
}

interface UsersResponse {
  status: string;
  count: number;
  users: UserRecord[];
}

export interface CreateUserPayload {
  first_name: string;
  middle_name?: string;
  last_name: string;
  second_last_name?: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'COURIER' | 'CUSTOMER';
  phone_number: string;
}

export interface UpdateUserPayload {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  phone_number?: string;
}

export const userService = {
  getUsers: async (role?: string): Promise<UsersResponse> => {
    const response = await api.get('/users', {
      params: role ? { role } : undefined,
    });
    return response.data;
  },

  createUser: async (payload: CreateUserPayload): Promise<{ status: string; user: UserRecord }> => {
    const response = await api.post('/users', payload);
    return response.data;
  },

  updateUser: async (id: string, payload: UpdateUserPayload): Promise<{ status: string; user: UserRecord }> => {
    const response = await api.patch(`/users/${id}`, payload);
    return response.data;
  },

  deactivateUser: async (id: string): Promise<void> => {
    await api.patch(`/users/${id}/deactivate`);
  },

  activateUser: async (id: string): Promise<void> => {
    await api.patch(`/users/${id}/activate`);
  },
};
