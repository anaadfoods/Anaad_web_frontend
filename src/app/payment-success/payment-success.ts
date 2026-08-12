import { LogService } from '../core/services/log.service';
// ============================================
// PaymentSuccess Component
//
// This page handles the final step of the Easebuzz popup payment flow:
//
//   1. The user initiates payment via checkout / order-detail / sub-detail.
//   2. The PaymentService launches a popup and polls for status.
//   3. On SUCCESS, the PaymentService routes the user to this page.
//   4. This component reads the session storage (or query params) to display a receipt.
//   5. A 5-second countdown triggers before auto-redirecting to the order/sub detail page.
// ============================================

import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderService } from '../core/services/order.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { PaymentService } from '../core/services/payment.service';
import { ToastService } from '../core/services/toast.service';
import { PaymentStatus } from '../core/models/order.model';
import { SubscriptionPaymentStatus } from '../core/models/subscription.model';
import {
  timer, switchMap, takeWhile, catchError, of,
  forkJoin, timeout, map, Observable, Subscription as RxSubscription
} from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.html',
  styleUrl: './payment-success.scss'
})
export class PaymentSuccess implements OnInit, OnDestroy {
  private readonly logSvc = inject(LogService);
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly orderSvc     = inject(OrderService);
  private readonly subSvc       = inject(SubscriptionService);
  private readonly paymentSvc   = inject(PaymentService);
  private readonly toastSvc     = inject(ToastService);
  private readonly platformId   = inject(PLATFORM_ID);
  private readonly cdr          = inject(ChangeDetectorRef);

  /** null = verifying, true = success, false = failed/pending */
  paymentSuccess: boolean | null = null;
  statusMessage = 'Initializing payment verification...';
  countdown = 3;

  receiptDetails: {
    id: number;
    number: string;
    transactionId: string;
    amount: string;
    type: 'order' | 'subscription';
  } | null = null;

  private redirectTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private syncSub?: RxSubscription;

  // ── Lifecycle ─────────────────────────────

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.logSvc.debug('[PaymentSuccess] ngOnInit');
    this.route.queryParams.subscribe(params => {
      this.logSvc.debug('[PaymentSuccess] Query params:', params);

      // Phase 1: resolve the pending transaction context
      // Priority: query params → sessionStorage fallback
      const typeParam        = params['type'];
      const orderNumberParam = params['order_number'] || params['order_id'] || params['reference'];
      const txnParam         = params['merchant_transaction_id'];

      let type        = typeParam        || sessionStorage.getItem('pendingPaymentType');
      const orderNum  = orderNumberParam || sessionStorage.getItem('pendingPaymentNumber');
      const txnId     = txnParam         || sessionStorage.getItem('pendingMerchantTransactionId');

      let isSubscription = type === 'subscription';

      if (!isSubscription && orderNum?.startsWith('SUB-')) {
        isSubscription = true;
      }

      this.logSvc.debug('[PaymentSuccess] Resolved payment details:', { isSubscription, orderNum, txnId });

      // Clear sessionStorage immediately so a page refresh doesn't re-trigger
      sessionStorage.removeItem('pendingPaymentId');
      sessionStorage.removeItem('pendingPaymentType');
      sessionStorage.removeItem('pendingPaymentNumber');
      sessionStorage.removeItem('pendingMerchantTransactionId');

      if (!orderNum) {
        this.logSvc.error('[PaymentSuccess] No pending transaction reference found.');
        this.statusMessage = 'No pending transaction found. Redirecting...';
        this.paymentSuccess = false;
        this.startHomeRedirect();
        return;
      }

      this.runVerificationFlow(orderNum, isSubscription, txnId || '—');
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.syncSub?.unsubscribe();
  }

  // ── Verification Flow ─────────────────────

  private runVerificationFlow(
    orderNumber: string,
    isSubscription: boolean,
    merchantTxnId: string
  ): void {
    this.statusMessage = 'Verifying payment status with backend...';
    this.logSvc.debug('[PaymentSuccess] Starting verification:', { orderNumber, isSubscription, merchantTxnId });

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds max polling

    this.syncSub = timer(0, 2000).pipe(
      switchMap(() => {
        attempts++;
        this.logSvc.debug(`[PaymentSuccess] Poll attempt #${attempts} for reference: ${orderNumber}`);
        return this.paymentSvc.getPaymentStatus(orderNumber).pipe(
          catchError(err => {
            this.logSvc.error(`[PaymentSuccess] Polling error on attempt #${attempts}:`, err);
            return of(null);
          })
        );
      }),
      takeWhile((res: any) => {
        this.logSvc.debug(`[PaymentSuccess] Attempt #${attempts} response:`, res);
        if (!res) return attempts < maxAttempts;

        const tStatus = res.transaction_status?.toUpperCase();

        // Keep polling as long as status is INITIATED or PENDING or null
        if (tStatus === 'INITIATED' || tStatus === 'PENDING' || !tStatus) {
          return attempts < maxAttempts;
        }

        // Final state reached
        return false;
      }, true /* inclusive */)
    ).subscribe({
      next: (res: any) => {
        this.logSvc.debug('[PaymentSuccess] Final poll response:', res);

        const tStatus = res?.transaction_status?.toUpperCase();
        const isSuccess = tStatus === 'SUCCESS' || (isSubscription && tStatus === 'ACTIVE');

        if (isSuccess) {
          this.paymentSuccess = true;
          this.statusMessage = isSubscription
            ? 'Subscription started successfully!'
            : 'Order placed successfully!';

          this.toastSvc.show(
            `Payment Successful! ${isSubscription ? 'Subscription' : 'Order'} #${orderNumber} confirmed.`,
            'success',
            5000
          );

          // Phase 2: Resolve DB ID so we can redirect to the details page and fetch paid amount
          this.resolveObjectId(orderNumber, isSubscription).subscribe({
            next: (resolvedId) => {
              this.logSvc.debug('[PaymentSuccess] Resolved database ID:', resolvedId);
              if (resolvedId) {
                this.receiptDetails = {
                  id: resolvedId,
                  number: orderNumber,
                  transactionId: merchantTxnId || '—',
                  amount: '—',
                  type: isSubscription ? 'subscription' : 'order'
                };
                this.cdr.markForCheck();

                // Fetch full details of the resolved order/subscription to show correct paid amount
                if (isSubscription) {
                  this.subSvc.getSubscriptionById(resolvedId).subscribe({
                    next: (details) => {
                      if (this.receiptDetails) {
                        this.receiptDetails.amount = details?.total || details?.subtotal || '—';
                        this.cdr.markForCheck();
                      }
                    },
                    complete: () => {
                      this.startRedirectTimer(resolvedId, isSubscription);
                    }
                  });
                } else {
                  this.orderSvc.getOrderById(resolvedId).subscribe({
                    next: (details) => {
                      if (this.receiptDetails) {
                        this.receiptDetails.amount = details?.total || details?.total_price || '—';
                        this.cdr.markForCheck();
                      }
                    },
                    complete: () => {
                      this.startRedirectTimer(resolvedId, isSubscription);
                    }
                  });
                }
              } else {
                // Fallback if DB ID is not resolved: redirect to profile / list page
                this.receiptDetails = {
                  id: 0,
                  number: orderNumber,
                  transactionId: merchantTxnId || '—',
                  amount: '—',
                  type: isSubscription ? 'subscription' : 'order'
                };
                this.cdr.markForCheck();
                this.startRedirectTimer(0, isSubscription);
              }
            },
            error: () => {
              this.startRedirectTimer(0, isSubscription);
            }
          });

        } else {
          // Failure / Cancelled / Abandoned
          this.paymentSuccess = false;
          const msg = res?.resp_message || 'Payment not completed or failed.';
          this.logSvc.warn('[PaymentSuccess] Payment terminal status is failed or pending:', tStatus);

          this.toastSvc.show(
            `Payment Verification: ${msg}`,
            'error',
            5000
          );

          // Resolve DB ID to pass to failure page so it can offer a retry
          this.resolveObjectId(orderNumber, isSubscription).subscribe({
            next: (resolvedId) => {
              const queryParams = {
                id: resolvedId || undefined,
                type: isSubscription ? 'subscription' : 'order',
                order_number: orderNumber,
                message: msg
              };
              this.router.navigate(['/payment-failure'], { queryParams });
            },
            error: () => {
              this.router.navigate(['/payment-failure'], { queryParams: { order_number: orderNumber, message: msg } });
            }
          });
        }
      },
      error: (err) => {
        this.logSvc.error('[PaymentSuccess] Polling stream crashed:', err);
        this.paymentSuccess = false;
        this.statusMessage = 'An error occurred during verification. Please check your profile.';
        this.router.navigate(['/payment-failure'], { queryParams: { order_number: orderNumber, message: 'Verification error' } });
      }
    });
  }

  private resolveObjectId(orderNum: string, isSubscription: boolean): Observable<number | null> {
    if (isSubscription) {
      return this.subSvc.getSubscriptions().pipe(
        map(subs => {
          const match = subs.find(s => s.subscription_number === orderNum);
          return match ? match.id : null;
        }),
        catchError(() => of(null))
      );
    } else {
      return this.orderSvc.getOrders().pipe(
        map(orders => {
          const match = orders.find(o => o.order_number === orderNum);
          return match ? match.id : null;
        }),
        catchError(() => of(null))
      );
    }
  }

  // ── Redirect Helpers ──────────────────────

  startRedirectTimer(objectId: number, isSubscription: boolean): void {
    this.clearTimers();
    this.countdown = 3;

    this.countdownInterval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
        this.cdr.markForCheck();
      }
    }, 1000);

    this.redirectTimer = setTimeout(() => {
      this.clearTimers();
      this.continueNavigation(objectId, isSubscription);
    }, 3000);
  }

  startHomeRedirect(): void {
    this.clearTimers();
    this.redirectTimer = setTimeout(() => {
      this.router.navigate(['/']);
    }, 2000);
  }

  continueNavigation(objectId: number, isSubscription: boolean): void {
    this.clearTimers();
    if (objectId && objectId > 0) {
      if (isSubscription) {
        this.router.navigate(['/subscription', objectId]);
      } else {
        this.router.navigate(['/order', objectId]);
      }
    } else {
      this.router.navigate(['/profile']);
    }
  }

  private clearTimers(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
    this.countdownInterval = null;
    this.redirectTimer = null;
  }
}
