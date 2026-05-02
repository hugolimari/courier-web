import api from './api';
import type { PackagesResponse, PackageStatus, Package, PackageFilters, PublicTrackingResult } from '../types/package';

export const packageService = {
  getPackages: async (filters?: PackageFilters): Promise<PackagesResponse> => {
    const response = await api.get('/packages', { params: filters });
    return response.data;
  },

  updatePackageStatus: async (id: string, status: PackageStatus): Promise<{ status: string; package: Package }> => {
    const response = await api.patch(`/packages/${id}/status`, { status });
    return response.data;
  },

  trackByCode: async (trackingNumber: string): Promise<{ status: string; package: PublicTrackingResult }> => {
    const response = await api.get(`/packages/track/${trackingNumber.trim().toUpperCase()}`);
    return response.data;
  },
};
