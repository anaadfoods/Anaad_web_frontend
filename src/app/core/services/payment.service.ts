// ============================================
// Payment Service
// Handles payment status checks for Easebuzz checkout.
//
// Architecture:
//   1. createOrder/createSubscription → checkout_url
//   2. Direct redirect browser to checkout_url
//   3. Poll GET /api/payments/status/<reference>/ on return
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { PaymentStatus } from '../models/order.model';
import { SubscriptionPaymentStatus } from '../models/subscription.model';

export interface PaymentInitiationResult {
  success: boolean;
  checkout_url?: string;
  order_number?: string;
  subscription_number?: string;
  order_id?: string | number;
  merchant_transaction_id?: string;
  message?: string;
  error?: string;
  details?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  // ── Payment Initiation ────────────────────
  // NOTE: This endpoint (/api/payments/initiate/) is a Juspay-era holdover.
  // It is kept temporarily because order-detail's retryPayment() still calls it.
  // Once backend provides a dedicated retry-payment endpoint, this should be
  // replaced or removed. Do NOT use for new code paths.
  initiatePayment(payload: {
    order_id?: number;
    subscription_id?: number;
    payment_type?: 'full' | 'installment';
  }): Observable<PaymentInitiationResult> {
    return this.http.post<PaymentInitiationResult>('/api/payments/initiate/', payload);
  }

  // ── Status Checks ─────────────────────────

  /**
   * Fetch unified payment status for order or subscription by its string reference.
   * GET /api/payments/status/<reference>/
   */
  getPaymentStatus(reference: string): Observable<any> {
    return this.http.get<any>(`${API.PAYMENTS.STATUS}${reference}/`);
  }

  /**
   * Fetch payment status for a standard order.
   * GET /api/payments/status/<orderId>/
   */
  getOrderPaymentStatus(orderId: number | string): Observable<PaymentStatus> {
    return this.http.get<PaymentStatus>(`${API.PAYMENTS.STATUS}${orderId}/`);
  }

  /**
   * Fetch payment status for a subscription.
   * GET /api/payments/status/<subscriptionId>/
   */
  getSubscriptionPaymentStatus(subscriptionId: number | string): Observable<SubscriptionPaymentStatus> {
    return this.http.get<SubscriptionPaymentStatus>(
      `${API.PAYMENTS.SUBSCRIPTION_STATUS}${subscriptionId}/`
    );
  }
}

