import api from './api';
import type { PackagesResponse, PackageStatus, Package } from '../types/package';

export const packageService = {
  getPackages: async (status?: PackageStatus): Promise<PackagesResponse> => {
    const response = await api.get('/packages', {
      params: { status }
    });
    return response.data;
  },
  
  updatePackageStatus: async (id: string, status: PackageStatus): Promise<{status: string, package: Package}> => {
    const response = await api.patch(`/packages/${id}/status`, { status });
    return response.data;
  }
};
