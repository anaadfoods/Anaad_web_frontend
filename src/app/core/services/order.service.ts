// ============================================
// Order Service
// Handles orders, tracking, payments, invoices
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../constants/api-endpoints';
import {
  CreateOrderRequest,
  Order,
  OrderTracking,
  PaymentStatus,
  InvoiceResponse,
  ShippingDetails,
  PaymentSession,
  CancelOrderResponse,
} from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  // ── Order CRUD ────────────────────────────

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[] | { data: Order[] }>(API.ORDERS.LIST).pipe(
      map(res => Array.isArray(res) ? res : res.data)
    );
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<Order>(`${API.ORDERS.DETAIL}${id}/`);
  }

  createOrder(req: CreateOrderRequest): Observable<Order | PaymentSession> {
    return this.http.post<Order | PaymentSession>(API.ORDERS.CREATE, req);
  }

  cancelOrder(id: number, reason?: string): Observable<CancelOrderResponse> {
    return this.http.post<CancelOrderResponse>(
      `${API.ORDERS.DETAIL}${id}/cancel-request/`,
      { reason }
    );
  }

  // ── Shipping ──────────────────────────────

  getShippingDetails(): Observable<ShippingDetails> {
    return this.http.get<ShippingDetails>(API.ORDERS.SHIPPING);
  }

  // ── Delivery Charges ──────────────────────

  calculateDeliveryCharges(
    pincode: string,
    items: Array<{ product_variant_id: number; quantity: number }>
  ): Observable<{ delivery_charges: { cod: number; prepaid: number }; expected_delivery_date: string }> {
    return this.http.post<{
      delivery_charges: { cod: number; prepaid: number };
      expected_delivery_date: string;
    }>(API.CORE.DELIVERY_CHARGES, { delivery_pincode: pincode, items });
  }

  // ── Tracking ──────────────────────────────

  getTracking(orderNumber: string): Observable<OrderTracking> {
    const params = new HttpParams().set('order_number', orderNumber);
    return this.http.get<OrderTracking>(API.ORDERS.TRACKING, { params });
  }

  getOrderTracking(orderNumber: string): Observable<OrderTracking> {
    return this.getTracking(orderNumber);
  }

  // ── Payment Status ────────────────────────

  getPaymentStatus(orderIdOrNumber: number | string): Observable<PaymentStatus> {
    return this.http.get<PaymentStatus>(`${API.ORDERS.PAYMENT_STATUS}${orderIdOrNumber}/`);
  }

  /**
   * Convenience alias used by PaymentSuccess component.
   */
  fetchPaymentStatus(orderIdOrNumber: number | string): Observable<PaymentStatus> {
    return this.getPaymentStatus(orderIdOrNumber);
  }

  // ── Invoice ───────────────────────────────

  getInvoice(orderNumber: string): Observable<InvoiceResponse> {
    return this.http.get<InvoiceResponse>(`${API.ORDERS.INVOICE}${orderNumber}/invoice/`);
  }

  downloadInvoice(orderNumber: string): Observable<InvoiceResponse> {
    return this.getInvoice(orderNumber);
  }
}
