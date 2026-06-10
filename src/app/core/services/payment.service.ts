// ============================================
// Payment Service
// Handles payment initiation, status checks,
// and the Node.js Juspay webhook bridge trigger.
//
// Architecture mirrors Flutter's payment flow:
//   1. createOrder/createSubscription → payment_links.web
//   2. Redirect user to Juspay gateway URL
//   3. Gateway redirects back → /payment-success or /payment-failure
//   4. PaymentSuccess component:
//      a. Calls postOrderId() → Node.js bridge (manual webhook trigger)
//      b. Polls getPaymentStatus() / getSubscriptionPaymentStatus()
//      c. Double-verifies before showing success
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, timeout } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { PaymentStatus } from '../models/order.model';
import { SubscriptionPaymentStatus } from '../models/subscription.model';
import { LogService } from './log.service';

export interface PaymentInitiationResult {
  success: boolean;
  payment_links?: {
    web: string;
    expiry?: string;
  };
  order_id?: string | number;
  merchant_transaction_id?: string;
  message?: string;
  error?: string;
  details?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly logSvc = inject(LogService);

  // ── Payment Initiation ────────────────────

  /**
   * Initiate payment for an existing Order or Subscription.
   * Useful for retrying failed/pending payments (e.g. RepaymentSubscription flow).
   */
  initiatePayment(payload: {
    order_id?: number;
    subscription_id?: number;
    payment_type?: 'full' | 'installment';
  }): Observable<PaymentInitiationResult> {
    return this.http.post<PaymentInitiationResult>(API.PAYMENTS.INITIATE, payload);
  }

  // ── Status Checks ─────────────────────────

  /**
   * Fetch payment status for a standard order.
   * Mirrors Flutter's _orderService.fetchPaymentStatus(orderId).
   * GET /api/payments/status/<orderId>/
   */
  getOrderPaymentStatus(orderId: number): Observable<PaymentStatus> {
    return this.http.get<PaymentStatus>(`${API.PAYMENTS.STATUS}${orderId}/`);
  }

  /**
   * Fetch payment status for a subscription.
   * Mirrors Flutter's subscription status check.
   * GET /api/payments/subscription-status/<subscriptionId>/
   */
  getSubscriptionPaymentStatus(subscriptionId: number): Observable<SubscriptionPaymentStatus> {
    return this.http.get<SubscriptionPaymentStatus>(
      `${API.PAYMENTS.SUBSCRIPTION_STATUS}${subscriptionId}/`
    );
  }

  // ── Node.js Bridge Trigger ────────────────

  /**
   * POST the order/transaction number to the secondary payment handler server.
   * This acts as a manual trigger to ensure Juspay's server-to-server webhook
   * is processed immediately, preventing status-update latency.
   *
   * Mirrors Flutter's: _orderService.postOrderId(orderNumber)
   *   → POST http://13.235.242.181:5000/handleJuspayResponse
   *   → body: x-www-form-urlencoded `order_id=<orderNumber>`
   *
   * This call is fire-and-forget with a 5-second timeout — a failure
   * here must NOT block the UI verification flow.
   */
  triggerJuspayWebhook(orderNumber: string): Observable<unknown> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    const body = new HttpParams().set('order_id', orderNumber).toString();

    return this.http
      .post(API.PAYMENT_HANDLER.HANDLE_JUSPAY_RESPONSE, body, { headers })
      .pipe(
        timeout(5000),
        catchError(err => {
          this.logSvc.warn('[PaymentService] triggerJuspayWebhook failed (non-blocking):', err);
          return of(null);
        })
      );
  }
}
