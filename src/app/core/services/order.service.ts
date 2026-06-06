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
  JuspaySession,
} from '../models/order.model';
import { PaymentService } from './payment.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly paymentSvc = inject(PaymentService);

  // ── Order CRUD ────────────────────────────

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[] | { data: Order[] }>(API.ORDERS.LIST).pipe(
      map(res => Array.isArray(res) ? res : res.data)
    );
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<Order>(`${API.ORDERS.DETAIL}${id}/`);
  }

  createOrder(req: CreateOrderRequest): Observable<Order | JuspaySession> {
    return this.http.post<Order | JuspaySession>(API.ORDERS.CREATE, req);
  }

  cancelOrder(id: number, reason?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
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

  getPaymentStatus(orderId: number): Observable<PaymentStatus> {
    return this.http.get<PaymentStatus>(`${API.ORDERS.PAYMENT_STATUS}${orderId}/`);
  }

  /**
   * Convenience alias used by PaymentSuccess component.
   * Mirrors Flutter's _orderService.fetchPaymentStatus(orderId).
   */
  fetchPaymentStatus(orderId: number): Observable<PaymentStatus> {
    return this.getPaymentStatus(orderId);
  }

  /**
   * Trigger the Node.js payment bridge for a given order number.
   * Mirrors Flutter's _orderService.postOrderId(orderNumber).
   * This is a fire-and-forget call; errors are swallowed internally.
   */
  postOrderId(orderNumber: string): Observable<unknown> {
    return this.paymentSvc.triggerJuspayWebhook(orderNumber);
  }

  // ── Invoice ───────────────────────────────

  getInvoice(orderNumber: string): Observable<InvoiceResponse> {
    return this.http.get<InvoiceResponse>(`${API.ORDERS.INVOICE}${orderNumber}/invoice/`);
  }

  downloadInvoice(orderNumber: string): Observable<InvoiceResponse> {
    return this.getInvoice(orderNumber);
  }
}
