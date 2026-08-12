// ============================================
// Subscription Models
// ============================================

export interface SubscriptionPlan {
  id: number;
  name: string;
  duration_months: number;
  discount_percentage: string;
  total_discount_percentage: number;
  tagline: string;
  description: string;
  is_active: boolean;
  activation_date: string;
  is_one_time_only: boolean;
  allows_installments: boolean;
  installment_frequency_months: number;
  is_available: boolean;
}

export interface SubscriptionItem {
  id: number;
  product_variant: number | { id: number; product_name: string };
  product_name?: string;
  product_category?: string;
  product_var_image?: string;
  quantity: number;
  price?: string;
  discounted_price?: string;
  unit_weight?: string;
  weight_unit?: string;
  total_weight?: string;
}

export interface Subscription {
  id: number;
  subscription_number?: string;
  status: SubscriptionStatus;
  plan: number | { id: number; name: string; duration_months: number };
  plan_name?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_pincode?: string;
  delivery_phone?: string;
  recipient_name?: string;
  payment_type?: 'INSTALLMENT' | 'PAID_FULL' | 'FULL_PAYMENT';
  payment_method?: 'COD' | 'UPI';
  payment_status?: string;
  start_date?: string;
  end_date?: string;
  subtotal?: string;
  delivery_charges?: string;
  total?: string;
  amount_paid?: string;
  remaining_amount?: string;
  next_delivery_date?: string;
  last_payment_date?: string | null;
  next_payment_date?: string;
  total_deliveries?: number;
  completed_deliveries?: number;
  remaining_pause_days?: number;
  remaining_pause_times?: number;
  pause_start_date?: string | null;
  pause_end_date?: string | null;
  items?: SubscriptionItem[];
  total_delivery_charges?: number;
  installment_info?: any;
  can_pay_next_installment?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'PENDING' | 'EXPIRED';

export interface CreateSubscriptionRequest {
  plan: number;
  recipient_name: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_pincode: string;
  delivery_phone: string;
  email?: string;
  notes?: string;
  payment_type: 'INSTALLMENT' | 'PAID_FULL' | 'FULL_PAYMENT';
  payment_method: 'COD' | 'UPI';
  delivery_fee: number;
  expected_delivery_date: string;
  items: Array<{ product_variant_id: number; quantity: number }>;
}

export interface SubscriptionPaymentStatus {
  subscription_id: number;
  payment_status: string;
  transaction_status?: string;
  transaction_id?: string;
  merchant_transaction_id?: string;
  amount?: string;
  resp_message?: string;
  error_code?: string | null;
  installment_payment_status?: string;
  created_at?: string;
}

export interface SubscriptionPaymentSession {
  success: boolean;
  checkout_url: string;
  subscription_id: number;
  subscription_number?: string;
  merchant_transaction_id?: string;
  message?: string;
}

export interface PlanProductsResponse {
  plan_id: number;
  plan_name: string;
  variants: Array<{
    variant_id: number;
    variant_name: string;
    max_weight_limit: number;
  }>;
}

export interface SubscriptionInvoice {
  success: boolean;
  subscription_id: number;
  invoices: Array<{
    id: number;
    odoo_invoice_number: string;
    s3_url: string;
    display_name: string;
  }>;
  total_invoices: number;
}

export interface CancelSubscriptionResponse {
  success?: boolean;
  status?: string;
  message?: string;
  refund_initiated?: boolean;
  subscription_number?: string;
  current_status?: string;
  raw_data?: any;
}

