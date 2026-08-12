import { LogService } from '../core/services/log.service';
// ============================================
// PaymentFailure Component
//
// Handles the Juspay gateway failure redirect:
//   /api/payments/failure (and /api/payment/failure)
//
// Flutter equivalent: WebViewPage NavigationDelegate
//   detects failure URL → shows cancellation dialog
//   → navigates back to CheckoutScreen.
//
// Angular equivalent: Dedicated route /payment-failure
//   1. Reads pending transaction from sessionStorage
//   2. Shows clear failure/cancellation UI
//   3. Offers retry → /checkout or browse → /products
// ============================================

import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-payment-failure',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-failure.html',
  styleUrl: './payment-failure.scss',
})
export class PaymentFailure implements OnInit {
  private readonly logSvc = inject(LogService);
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  orderNumber = '';
  orderId: number | null = null;
  isSubscription = false;
  errorMessage = '';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.route.queryParams.subscribe(params => {
      let storedId     = params['id']     || sessionStorage.getItem('pendingPaymentId');
      let storedType   = params['type']   || sessionStorage.getItem('pendingPaymentType');
      let storedNumber = params['order_number'] || params['order_id'] || params['reference']
                       || sessionStorage.getItem('pendingPaymentNumber');
      this.errorMessage = params['message'] || params['error_message'] || '';

      // Clean up immediately
      sessionStorage.removeItem('pendingPaymentId');
      sessionStorage.removeItem('pendingPaymentType');
      sessionStorage.removeItem('pendingPaymentNumber');
      sessionStorage.removeItem('pendingMerchantTransactionId');

      if (!storedType && storedNumber?.startsWith('SUB-')) {
        storedType = 'subscription';
      }

      this.orderId        = storedId ? Number(storedId) : null;
      this.isSubscription = storedType === 'subscription';
      this.orderNumber    = storedNumber || '';

      this.logSvc.debug('[PaymentFailure] Context resolved:', {
        orderId: this.orderId,
        isSubscription: this.isSubscription,
        orderNumber: this.orderNumber,
      });
    });
  }

  retryPayment(): void {
    // Navigate back to checkout; query params preserve any direct-buy context
    this.router.navigate(['/checkout']);
  }

  viewOrders(): void {
    this.router.navigate(['/profile']);
  }

  continueShopping(): void {
    this.router.navigate(['/product']);
  }
}
