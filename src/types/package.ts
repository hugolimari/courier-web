export type PackageStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export interface Package {
  id: string;
  company_id: string;
  tracking_number: string;
  customer_id: string;
  courier_id: string | null;
  destination_address: string;
  location_reference: string;
  destination_point: string; // GeoJSON
  status: PackageStatus;
  cash_to_collect: number;
  created_at: string;
  updated_at: string;
  customer_name: string;
  courier_name: string | null;
}

export interface PackagesResponse {
  status: string;
  count: number;
  packages: Package[];
}
