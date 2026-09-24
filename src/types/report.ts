// Replaces old Django-based types

export interface VehiclePreview {
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  trim: string | null;
  engine: string | null;
  fuel_type: string | null;
  drive_type: string | null;
  body_type: string | null;
  country_of_manufacture: string | null;
  doors: number | null;
  identifier_type: string;
  source_country: string;
  recall_count: number;
}

export interface Recall {
  recall_number: string;
  component: string;
  summary: string;
  remedy?: string;
  is_open: boolean;
}

export interface ProcessedData {
  vehicle: VehiclePreview;
  recalls: Recall[];
  accidents: Record<string, unknown>[];
  theft: Record<string, unknown>[];
  odometer_records: Record<string, unknown>[];
}

export interface Report {
  id: string;
  vin: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'INVALID_VIN';
  processed_data: ProcessedData;
  ai_summary: string | null;
  share_token: string;
  is_public: boolean;
  completed_at: string | null;
  created_at: string;
  // legacy field used in UI
  search_identifier: string;
}

export interface ReportListItem {
  id: string;
  vin: string;
  status: string;
  created_at: string;
  // alias for vin in list views
  search_identifier: string;
}

export interface DashboardData {
  stats: {
    total_reports: number;
    completed: number;
    pending: number;
    total_spent_ngn: number;
  };
  reports: ReportListItem[];
  user: {
    name: string;
    email: string;
    member_since: string;
  };
}
