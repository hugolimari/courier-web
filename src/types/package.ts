export type PackageStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';

export interface DeliveryProof {
  proof_id: string;
  proof_image_url: string;
  proof_receiver_name: string | null;
  proof_receiver_ci: string | null;
  proof_delivery_point: string | null; // GeoJSON
  proof_created_at: string;
}

export interface Package {
  id: string;
  company_id: string;
  tracking_number: string;
  client_code: string | null;  // optional client's own reference code
  customer_id: string;
  courier_id: string | null;
  destination_address: string;
  location_reference: string;
  destination_point: string; // GeoJSON
  status: PackageStatus;
  cash_to_collect: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name: string;
  courier_name: string | null;
  // Delivery proof (null unless status === 'DELIVERED')
  proof_id: string | null;
  proof_image_url: string | null;
  proof_receiver_name: string | null;
  proof_receiver_ci: string | null;
  proof_delivery_point: string | null;
  proof_created_at: string | null;
}

export interface PackagesResponse {
  status: string;
  count: number;
  packages: Package[];
}

export interface PackageFilters {
  status?: PackageStatus;
  courier_id?: string;
  date_from?: string;
  date_to?: string;
}

// Public tracking response (less fields, includes proof summary)
export interface PublicTrackingResult {
  tracking_number: string;
  status: PackageStatus;
  destination_address: string;
  location_reference: string;
  destination_point: string;
  cash_to_collect: number;
  created_at: string;
  updated_at: string;
  proof_image_url: string | null;
  proof_receiver_name: string | null;
  proof_delivery_point: string | null; // GeoJSON point from PostGIS
  proof_created_at: string | null;
}
