import api from './api';
import type { User } from '../types/auth';

interface UsersResponse {
  status: string;
  count: number;
  users: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'role'>[];
}

export const userService = {
  getUsers: async (role?: string): Promise<UsersResponse> => {
    const response = await api.get('/users', {
      params: role ? { role } : undefined,
    });
    return response.data;
  },
};
