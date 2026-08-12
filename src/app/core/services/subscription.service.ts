// ============================================
// Subscription Service
// Handles subscription plans, CRUD, payments
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../constants/api-endpoints';
import {
  SubscriptionPlan,
  Subscription,
  CreateSubscriptionRequest,
  SubscriptionPaymentStatus,
  SubscriptionInvoice,
  SubscriptionPaymentSession,
  PlanProductsResponse,
  CancelSubscriptionResponse,
} from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);

  // ── Plans ─────────────────────────────────

  getPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(API.SUBSCRIPTIONS.PLANS);
  }

  getPlanById(id: number): Observable<SubscriptionPlan> {
    return this.http.get<SubscriptionPlan>(`${API.SUBSCRIPTIONS.PLANS}${id}/`);
  }

  getPlanProducts(planId: number): Observable<PlanProductsResponse> {
    return this.http.get<PlanProductsResponse>(`${API.SUBSCRIPTIONS.PLAN_PRODUCTS}${planId}/products`);
  }

  getPlanPricesByVariant(variantId: number): Observable<{plan_id: number, plan_name: string, discounted_price: number, discount_percentage: number}[]> {
    const params = new HttpParams().set('variant_id', variantId.toString());
    return this.http.get<any[]>(API.SUBSCRIPTIONS.PLAN_SEARCH, { params });
  }

  // ── Subscriptions CRUD ────────────────────

  getSubscriptions(): Observable<Subscription[]> {
    return this.http.get<Subscription[] | { subscriptions: Record<string, Subscription[]> }>(API.SUBSCRIPTIONS.LIST).pipe(
      map(res => Array.isArray(res) ? res : Object.values(res.subscriptions).flat())
    );
  }

  getSubscriptionById(id: number): Observable<Subscription> {
    return this.http.get<Subscription>(`${API.SUBSCRIPTIONS.DETAIL}${id}/`);
  }

  createSubscription(req: CreateSubscriptionRequest): Observable<Subscription | SubscriptionPaymentSession> {
    return this.http.post<Subscription | SubscriptionPaymentSession>(API.SUBSCRIPTIONS.CREATE, req);
  }

  // ── Lifecycle ─────────────────────────────

  pauseSubscription(id: number, pauseData?: { pause_start_date?: string; pause_end_date?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API.SUBSCRIPTIONS.DETAIL}${id}/pause/`,
      pauseData || {}
    );
  }

  resumeSubscription(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API.SUBSCRIPTIONS.DETAIL}${id}/pause/`,
      {}
    );
  }

  cancelSubscription(id: number, reason?: string): Observable<CancelSubscriptionResponse> {
    return this.http.post<CancelSubscriptionResponse>(
      `${API.SUBSCRIPTIONS.DETAIL}${id}/cancel/`,
      { reason }
    );
  }

  // ── Installments ──────────────────────────

  payNextInstallment(subscriptionId: number): Observable<SubscriptionPaymentSession> {
    return this.http.post<SubscriptionPaymentSession>(
      `${API.SUBSCRIPTIONS.NEXT_INSTALLMENT_PAYMENT}${subscriptionId}/next-installment-payment/`,
      {}
    );
  }

  // ── Payment Status ────────────────────────

  getPaymentStatus(subscriptionIdOrNumber: number | string): Observable<SubscriptionPaymentStatus> {
    return this.http.get<SubscriptionPaymentStatus>(`${API.SUBSCRIPTIONS.PAYMENT_STATUS}${subscriptionIdOrNumber}/`);
  }

  getSubscriptionPaymentStatus(subscriptionIdOrNumber: number | string): Observable<SubscriptionPaymentStatus> {
    return this.getPaymentStatus(subscriptionIdOrNumber);
  }

  // ── Invoices ──────────────────────────────

  getInvoices(subscriptionId: number): Observable<SubscriptionInvoice> {
    return this.http.get<SubscriptionInvoice>(`${API.SUBSCRIPTIONS.INVOICES}${subscriptionId}/invoices/`);
  }

  getSubscriptionInvoices(subscriptionId: number): Observable<SubscriptionInvoice> {
    return this.getInvoices(subscriptionId);
  }
}
