// ============================================
// Order Models
// Mapped from: /api/orders/*, /api/payments/*,
//              /api/shiprocket/*, /api/odoo/*
// ============================================

/** POST /api/orders/ */
export interface CreateOrderRequest {
  payment_method: 'COD' | 'UPI';
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_pincode: string;
  delivery_phone: string;
  recipient_name: string;
  email?: string;
  notes?: string;
  delivery_fee: number;
  expected_delivery_date: string;
  items: Array<{
    product_variant_id: number;
    quantity: number;
  }>;
}

/** Individual item in an order */
export interface OrderItem {
  id: number;
  product_variant: number | { id: number; product_name?: string };
  product_name: string;
  variant_name: string;
  quantity: number;
  price: string;
  total_price: string;
  image?: string;
  product_details?: any;
}

/** GET /api/orders/ list & GET /api/orders/{id}/ */
export interface Order {
  id: number;
  order_number: string;
  items: OrderItem[];
  subtotal?: string;
  tax?: string;
  delivery_charges?: string;
  discount?: string;
  total?: string;
  total_price?: string;
  status: OrderStatus;
  payment_method: 'COD' | 'UPI';
  payment_status: PaymentStatusType;
  delivery_address?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_pincode?: string;
  delivery_phone?: string;
  recipient_name?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_pincode?: string;
  shipping_phone?: string;
  expected_delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'CANCEL_REQUESTED'
  | 'RETURNED';

export type PaymentStatusType =
  | 'UNPAID'
  | 'PAID'
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED';

/** GET /api/user/details/ — shipping address */
export interface ShippingDetails {
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  shipping_phone: string;
  shipping_name: string;
}

/** GET /api/shiprocket/orders/tracking_by_order/?order_number= */
export interface OrderTracking {
  id?: number;
  order?: number;
  order_number: string;
  order_status?: string;
  awb_number?: string;
  status: string;
  estimated_delivery: string;
  pickup_scheduled_at?: string;
  tracking_events: TrackingEvent[];
}

export interface TrackingEvent {
  id?: number;
  status: string;
  timestamp: string;
  activity: string;
  location: string;
  courier_status?: string;
  courier_status_code?: string;
}

/** GET /api/payments/status/?order_id= */
export interface PaymentStatus {
  order_id: number;
  order_number?: string;
  payment_status: PaymentStatusType;
  transaction_status?: string;
  transaction_id?: string;
  merchant_transaction_id?: string;
  amount?: string;
  resp_message?: string;
  error_code?: string | null;
}

/** Easebuzz payment session (returned when payment_method=UPI) */
export interface PaymentSession {
  order_id: string;
  checkout_url: string;
  order_number?: string;
  merchant_transaction_id?: string;
  message?: string;
}

/** GET /api/odoo/orders/?order_number= */
export interface InvoiceResponse {
  success: boolean;
  invoice: {
    s3_url: string;
    display_name: string;
  };
}

/** POST /api/orders/{id}/cancel-request/ */
export interface CancelOrderRequest {
  reason?: string;
}

export interface CancelOrderResponse {
  success?: boolean;
  status?: string;
  message?: string;
  refund_initiated?: boolean;
  order_number?: string;
  current_status?: string;
  raw_data?: any;
}

