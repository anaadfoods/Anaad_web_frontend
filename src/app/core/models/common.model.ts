// ============================================
// Common / Shared Models
// Mapped from: /api/core/*, /api/panchang/*,
//              /api/rfp/*
// ============================================

/** Generic API response wrapper */
export interface ApiResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

/** Generic API error */
export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

/** GET /api/core/states/ */
export interface StateLocation {
  id: number;
  name: string;
  code: string;
}

/** GET /api/core/cities/?state= */
export interface CityLocation {
  id: number;
  name: string;
  state: number;
}

/** GET /api/core/legal/latest/?type= */
export interface LegalDocument {
  id: number;
  type: 'terms' | 'privacy' | 'refund' | 'shipping';
  title: string;
  content: string;
  version: string;
  effective_date: string;
  updated_at: string;
}

/** GET /api/core/user-summary/ */
export interface UserSummary {
  total_orders: number;
  total_spent: string;
  active_subscriptions: number;
  total_savings: string;
  favorite_count: number;
  referral_count: number;
}

// ============================================
// Panchang Models (placeholder — fill when API is ready)
// ============================================

/** GET /api/panchang/today/ */
export interface PanchangData {
  date: string;
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise: string;
  sunset: string;
  moonrise: string;
  rahukaal: string;
  auspicious_time?: string;
}

// ============================================
// RFP (Contract Farming) Models
// ============================================

/** GET /api/rfp/plans/ */
export interface RfpPlan {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_months: number;
  land_area: string;
  products: RfpProduct[];
  is_active: boolean;
}

export interface RfpProduct {
  id: number;
  product_name: string;
  quantity: string;
  unit: string;
}

/** GET /api/rfp/deliveries/ */
export interface RfpDelivery {
  id: number;
  plan: number;
  delivery_date: string;
  status: 'SCHEDULED' | 'DISPATCHED' | 'DELIVERED';
  items: RfpDeliveryItem[];
}

export interface RfpDeliveryItem {
  product_name: string;
  quantity: string;
  unit: string;
}

/** Favorite variant ID set type alias */
export type FavoriteVariantId = number;
