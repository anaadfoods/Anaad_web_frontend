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
  JuspaySubscriptionSession,
  PlanProductsResponse,
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

  // ── Subscriptions CRUD ────────────────────

  getSubscriptions(): Observable<Subscription[]> {
    return this.http.get<Subscription[] | { subscriptions: Record<string, Subscription[]> }>(API.SUBSCRIPTIONS.LIST).pipe(
      map(res => Array.isArray(res) ? res : Object.values(res.subscriptions).flat())
    );
  }

  getSubscriptionById(id: number): Observable<Subscription> {
    return this.http.get<Subscription>(`${API.SUBSCRIPTIONS.DETAIL}${id}/`);
  }

  createSubscription(req: CreateSubscriptionRequest): Observable<Subscription | JuspaySubscriptionSession> {
    return this.http.post<Subscription | JuspaySubscriptionSession>(API.SUBSCRIPTIONS.CREATE, req);
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

  cancelSubscription(id: number, reason?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API.SUBSCRIPTIONS.DETAIL}${id}/cancel/`,
      { reason }
    );
  }

  // ── Installments ──────────────────────────

  payNextInstallment(subscriptionId: number): Observable<JuspaySubscriptionSession> {
    return this.http.post<JuspaySubscriptionSession>(
      `${API.SUBSCRIPTIONS.NEXT_INSTALLMENT_PAYMENT}${subscriptionId}/next-installment-payment/`,
      {}
    );
  }

  // ── Payment Status ────────────────────────

  getPaymentStatus(subscriptionId: number): Observable<SubscriptionPaymentStatus> {
    return this.http.get<SubscriptionPaymentStatus>(`${API.SUBSCRIPTIONS.PAYMENT_STATUS}${subscriptionId}/`);
  }

  getSubscriptionPaymentStatus(subscriptionId: number): Observable<SubscriptionPaymentStatus> {
    return this.getPaymentStatus(subscriptionId);
  }

  // ── Invoices ──────────────────────────────

  getInvoices(subscriptionId: number): Observable<SubscriptionInvoice> {
    return this.http.get<SubscriptionInvoice>(`${API.SUBSCRIPTIONS.INVOICES}${subscriptionId}/invoices/`);
  }

  getSubscriptionInvoices(subscriptionId: number): Observable<SubscriptionInvoice> {
    return this.getInvoices(subscriptionId);
  }
}
