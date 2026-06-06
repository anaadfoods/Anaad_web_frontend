// ============================================
// PaymentSuccess Component
//
// This page is the Angular equivalent of Flutter's Phase 3 & 4 flow:
//
//   Flutter WebViewPage → detects success URL → calls fetchPaymentStatus
//   + postOrderId (bridge trigger) → passes to CheckoutScreen callback
//   → _verifyAndHandlePaymentSuccess() → final fetchPaymentStatus check
//   → navigate to Order Details.
//
// Angular equivalent:
//   Juspay Gateway → redirects to /api/payments/success
//   → Django backend forwards to Angular /payment-success?id=X&type=Y
//   → This component:
//       1. Reads pending payment context (query params → sessionStorage fallback)
//       2. Calls triggerJuspayWebhook (postOrderId) — non-blocking bridge trigger
//       3. Polls getPaymentStatus every 2s (up to 8 attempts = 16s max)
//       4. On confirmed SUCCESS → shows receipt → auto-navigates to details
//       5. On FAILED/timeout → shows pending warning → navigates to details
// ============================================

import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderService } from '../core/services/order.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { PaymentService } from '../core/services/payment.service';
import { ToastService } from '../core/services/toast.service';
import {
  timer, switchMap, takeWhile, catchError, of,
  forkJoin, timeout, Subscription as RxSubscription
} from 'rxjs';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-success.html',
  styleUrl: './payment-success.scss'
})
export class PaymentSuccess implements OnInit, OnDestroy {
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly orderSvc     = inject(OrderService);
  private readonly subSvc       = inject(SubscriptionService);
  private readonly paymentSvc   = inject(PaymentService);
  private readonly toastSvc     = inject(ToastService);
  private readonly platformId   = inject(PLATFORM_ID);

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

    console.log('[PaymentSuccess] ngOnInit');

    this.route.queryParams.subscribe(params => {
      console.log('[PaymentSuccess] Query params:', params);

      // Phase 1: resolve the pending transaction context
      // Priority: query params → sessionStorage fallback (set during checkout redirect)
      const idParam          = params['id'];
      const typeParam        = params['type'];
      const orderNumberParam = params['order_number'] || params['order_id'];

      let orderIdStr  = idParam          || sessionStorage.getItem('pendingPaymentId');
      let type        = typeParam        || sessionStorage.getItem('pendingPaymentType');
      const orderNum  = orderNumberParam || sessionStorage.getItem('pendingPaymentNumber') || orderIdStr;

      let isSubscription = type === 'subscription';

      // Parse subscription ID from transaction number format "SUB-XX-..."
      if (!orderIdStr && orderNum?.startsWith('SUB-')) {
        isSubscription = true;
        const parts = orderNum.split('-');
        if (parts.length > 1) orderIdStr = parts[1];
      }

      console.log('[PaymentSuccess] Resolved:', { orderIdStr, isSubscription, orderNum });

      // Clear sessionStorage immediately so a page refresh doesn't re-trigger
      sessionStorage.removeItem('pendingPaymentId');
      sessionStorage.removeItem('pendingPaymentType');
      sessionStorage.removeItem('pendingPaymentNumber');

      if (!orderIdStr) {
        console.error('[PaymentSuccess] No pending transaction reference found.');
        this.statusMessage = 'No pending transaction found. Redirecting...';
        this.paymentSuccess = false;
        this.startHomeRedirect();
        return;
      }

      this.runVerificationFlow(Number(orderIdStr), isSubscription, orderNum || orderIdStr);
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.syncSub?.unsubscribe();
  }

  // ── Verification Flow ─────────────────────

  /**
   * Mirrors Flutter's two-step verification:
   *   Step 1 (WebViewPage): postOrderId + fetchPaymentStatus
   *   Step 2 (CheckoutScreen): _verifyAndHandlePaymentSuccess → fetchPaymentStatus again
   *
   * Angular implementation:
   *   1. Fire-and-forget triggerJuspayWebhook (postOrderId equivalent)
   *   2. Poll status with forkJoin → timer until final state
   */
  private runVerificationFlow(
    orderId: number,
    isSubscription: boolean,
    orderNumber: string
  ): void {
    this.statusMessage = 'Synchronizing transaction details...';
    console.log('[PaymentSuccess] Starting verification:', { orderId, isSubscription, orderNumber });

    // Step 1: Trigger the Node.js bridge (non-blocking, mirrors postOrderId)
    const bridgeTrigger$ = this.paymentSvc.triggerJuspayWebhook(orderNumber).pipe(
      timeout(5000),
      catchError(err => {
        console.warn('[PaymentSuccess] Bridge trigger failed (non-blocking):', err);
        return of(null);
      })
    );

    // Step 2: After bridge, poll Django for actual status
    this.syncSub = forkJoin([bridgeTrigger$]).pipe(
      switchMap(() => {
        this.statusMessage = 'Verifying payment status with backend...';
        let attempts = 0;
        const maxAttempts = 8;

        return timer(0, 2000).pipe(
          switchMap(() => {
            attempts++;
            console.log(`[PaymentSuccess] Poll attempt #${attempts}`);

            const statusPoll$ = isSubscription
              ? this.subSvc.getPaymentStatus(orderId).pipe(catchError(() => of(null)))
              : this.orderSvc.getPaymentStatus(orderId).pipe(catchError(() => of(null)));

            return statusPoll$;
          }),
          takeWhile(res => {
            console.log(`[PaymentSuccess] Attempt #${attempts} response:`, res);
            if (!res) return attempts < maxAttempts;

            const pStatus = (res as any).payment_status;
            const tStatus = (res as any).transaction_status;

            if (isSubscription) {
              if (tStatus === 'SUCCESS' || tStatus === 'ACTIVE' || tStatus === 'FAILED') {
                return false;
              }
            } else {
              if (pStatus === 'PAID' && tStatus === 'SUCCESS') return false;
              if (tStatus === 'FAILED') return false;
            }

            return attempts < maxAttempts;
          }, true /* inclusive — emit the last value that returned false */)
        );
      })
    ).subscribe({
      next: (res: any) => {
        console.log('[PaymentSuccess] Final poll response:', res);

        const isSuccess = isSubscription
          ? (res?.transaction_status === 'SUCCESS' || res?.transaction_status === 'ACTIVE')
          : (res?.payment_status === 'PAID' && res?.transaction_status === 'SUCCESS');

        this.receiptDetails = {
          id: orderId,
          number: res?.order_number || res?.orderNumber || orderNumber,
          transactionId: res?.transaction_id || res?.merchant_transaction_id || '—',
          amount: res?.amount || '—',
          type: isSubscription ? 'subscription' : 'order',
        };

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
          console.log('[PaymentSuccess] SUCCESS — starting redirect timer');
        } else {
          this.paymentSuccess = false;
          this.statusMessage =
            'Payment status is being processed. Your order is saved — we\'ll update you shortly.';

          this.toastSvc.show(
            'Payment verification pending. Check your profile for status updates.',
            'info',
            6000
          );
          console.warn('[PaymentSuccess] PENDING/FAILED — navigating to details');
        }

        this.startRedirectTimer(orderId, isSubscription);
      },
      error: (err) => {
        console.error('[PaymentSuccess] Verification stream error:', err);
        this.paymentSuccess = false;
        this.statusMessage = 'An error occurred during verification. Please check your profile.';
        this.startRedirectTimer(orderId, isSubscription);
      }
    });
  }

  // ── Redirect Helpers ──────────────────────

  startRedirectTimer(objectId: number, isSubscription: boolean): void {
    this.clearTimers();
    this.countdown = 3;

    this.countdownInterval = setInterval(() => {
      if (this.countdown > 0) this.countdown--;
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
    if (isSubscription) {
      this.router.navigate(['/subscriptions', objectId]);
    } else {
      this.router.navigate(['/orders', objectId]);
    }
  }

  private clearTimers(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.redirectTimer) clearTimeout(this.redirectTimer);
    this.countdownInterval = null;
    this.redirectTimer = null;
  }
}
