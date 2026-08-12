import { LogService } from '../core/services/log.service';
import { Component, OnInit, inject, PLATFORM_ID, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthState } from '../core/state/auth.state';
import { OrderService } from '../core/services/order.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { Order } from '../core/models/order.model';
import { Subscription } from '../core/models/subscription.model';
import { timer, switchMap, takeWhile, catchError, of } from 'rxjs';
import { CurrencyInrPipe } from '../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../shared/safe-image.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-thank-you',
  standalone: true,
  imports: [CommonModule, CurrencyInrPipe, SafeImageDirective],
  templateUrl: './thank-you.component.html',
  styleUrl: './thank-you.component.scss'
})
export class ThankYouComponent implements OnInit {
  private readonly logSvc = inject(LogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authState = inject(AuthState);
  private readonly orderSvc = inject(OrderService);
  private readonly subSvc = inject(SubscriptionService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  orderNumber = '';
  orderId: number | null = null;
  isSubscription = false;
  paymentStatus = 'Checking status...';
  isPolling = false;
  
  orderData: Order | null = null;
  subscriptionData: Subscription | null = null;

  ngOnInit() {
    this.logSvc.debug('[DEBUG] [ThankYouComponent] ngOnInit initialized');

    this.route.queryParams.subscribe(params => {
      this.logSvc.debug('[DEBUG] [ThankYouComponent] Query parameters received:', params);
      let storedId = params['id'] || null;
      let storedType = params['type'] || null;
      let storedNumber = params['order'] || params['order_id'] || null;
      
      if (isPlatformBrowser(this.platformId)) {
        if (!storedId) storedId = sessionStorage.getItem('pendingPaymentId');
        if (!storedType) storedType = sessionStorage.getItem('pendingPaymentType');
        if (!storedNumber) storedNumber = sessionStorage.getItem('pendingPaymentNumber');

        this.logSvc.debug('[DEBUG] [ThankYouComponent] sessionStorage fallback values:', {
          session_pendingPaymentId: sessionStorage.getItem('pendingPaymentId'),
          session_pendingPaymentType: sessionStorage.getItem('pendingPaymentType'),
          session_pendingPaymentNumber: sessionStorage.getItem('pendingPaymentNumber')
        });

        // Clear the storage so we don't accidentally verify again on a refresh
        sessionStorage.removeItem('pendingPaymentId');
        sessionStorage.removeItem('pendingPaymentType');
        sessionStorage.removeItem('pendingPaymentNumber');
      }
      
      this.orderId = storedId ? Number(storedId) : null;
      this.isSubscription = storedType === 'subscription';
      this.orderNumber = storedNumber || '';
      
      this.logSvc.debug('[DEBUG] [ThankYouComponent] Evaluated class properties:', {
        orderId: this.orderId,
        isSubscription: this.isSubscription,
        orderNumber: this.orderNumber
      });

      const isCod = params['isCod'] === 'true';
      
      if (this.orderId) {
        if (isCod) {
          this.logSvc.debug('[DEBUG] [ThankYouComponent] Cash on Delivery detected. No polling needed.');
          this.paymentStatus = 'Order Confirmed (Cash on Delivery)';
          this.fetchOrderDetails();
        } else {
          this.logSvc.debug('[DEBUG] [ThankYouComponent] Online payment detected. Initiating status polling.');
          this.pollPaymentStatus();
        }
      } else {
        this.logSvc.warn('[DEBUG] [ThankYouComponent] No order ID detected. Setting default order confirmation message.');
        this.paymentStatus = 'Order Confirmed';
      }
      this.cdr.markForCheck();
    });
  }

  pollPaymentStatus() {
    if (!this.orderId || !isPlatformBrowser(this.platformId)) {
      this.logSvc.warn('[DEBUG] [ThankYouComponent] Skipping poll: orderId is null or not in browser platform.');
      return;
    }
    this.isPolling = true;
    this.paymentStatus = 'Verifying your payment...';
    
    let attempts = 0;
    this.logSvc.debug('[DEBUG] [ThankYouComponent] Starting pollPaymentStatus loop...');

    timer(0, 3000).pipe(
      switchMap(() => {
        attempts++;
        if (this.isSubscription) {
          const url = `/api/payments/subscription-status/${this.orderId!}/`;
          this.logSvc.debug(`[DEBUG] [ThankYouComponent] Polling attempt #${attempts} | GET: ${url}`);
          return this.subSvc.getPaymentStatus(this.orderId!).pipe(
            catchError(err => {
              this.logSvc.error(`[DEBUG] [ThankYouComponent] Polling error on attempt #${attempts}:`, err);
              return of(null);
            })
          );
        } else {
          const url = `/api/payments/status/${this.orderId!}/`;
          this.logSvc.debug(`[DEBUG] [ThankYouComponent] Polling attempt #${attempts} | GET: ${url}`);
          return this.orderSvc.getPaymentStatus(this.orderId!).pipe(
            catchError(err => {
              this.logSvc.error(`[DEBUG] [ThankYouComponent] Polling error on attempt #${attempts}:`, err);
              return of(null);
            })
          );
        }
      }),
      takeWhile(res => {
        this.logSvc.debug(`[DEBUG] [ThankYouComponent] Polling attempt #${attempts} response details:`, res);
        if (!res) return true;
        const pStatus = res.payment_status;
        const tStatus = res.transaction_status;
        
        this.logSvc.debug(`[DEBUG] [ThankYouComponent] Status check: payment_status=${pStatus}, transaction_status=${tStatus}`);

        // Keep polling if state is pending/initiated
        if (this.isSubscription) {
          if (tStatus === 'SUCCESS' || tStatus === 'ACTIVE' || tStatus === 'FAILED') {
            this.logSvc.debug(`[DEBUG] [ThankYouComponent] Reached final subscription state: ${tStatus}. Stopping poll.`);
            return false;
          }
        } else {
          if (pStatus === 'PAID' && tStatus === 'SUCCESS') {
            this.logSvc.debug(`[DEBUG] [ThankYouComponent] Reached final paid order state: ${pStatus}/${tStatus}. Stopping poll.`);
            return false;
          }
          if (tStatus === 'FAILED') {
            this.logSvc.debug(`[DEBUG] [ThankYouComponent] Reached failed order state: ${tStatus}. Stopping poll.`);
            return false;
          }
        }
        return true;
      }, true)
    ).subscribe(res => {
      this.logSvc.debug('[DEBUG] [ThankYouComponent] Polling subscription finished. Final response resolved:', res);
      const isSuccess = this.isSubscription
        ? (res?.transaction_status === 'SUCCESS' || res?.transaction_status === 'ACTIVE')
        : (res?.payment_status === 'PAID' && res?.transaction_status === 'SUCCESS');

      this.logSvc.debug('[DEBUG] [ThankYouComponent] Verification result flag:', { isSuccess });

      if (isSuccess) {
        this.paymentStatus = 'Payment Successful! Redirecting...';
        this.isPolling = false;
        this.logSvc.debug(`[DEBUG] [ThankYouComponent] Success. Navigating to details screen: /${this.isSubscription ? 'subscriptions' : 'orders'}/${this.orderId}`);
        this.cdr.markForCheck();
        if (this.isSubscription) {
          this.router.navigate(['/subscription', this.orderId]);
        } else {
          this.router.navigate(['/order', this.orderId]);
        }
      } else {
        this.logSvc.warn('[DEBUG] [ThankYouComponent] Verification resolved to failure or timed out.');
        this.paymentStatus = 'Payment check completed with pending status or failed. Your order is saved—you can check it in your profile.';
        this.isPolling = false;
        this.fetchOrderDetails();
        this.cdr.markForCheck();
      }
    });
  }

  fetchOrderDetails() {
    if (!this.orderId || !isPlatformBrowser(this.platformId)) return;
    if (this.isSubscription) {
      this.subSvc.getSubscriptionById(this.orderId).subscribe({
        next: (sub) => {
          this.subscriptionData = sub;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.orderSvc.getOrderById(this.orderId).subscribe({
        next: (ord) => {
          this.orderData = ord;
          this.cdr.markForCheck();
        }
      });
    }
  }

  continueShopping() { this.router.navigate(['/product']); }
  viewOrders() {
    if (this.orderId) {
      if (this.isSubscription) {
        this.router.navigate(['/subscription', this.orderId]);
      } else {
        this.router.navigate(['/order', this.orderId]);
      }
    } else {
      this.router.navigate(['/profile']);
    }
  }

  // UI Helpers
  get orderItems(): any[] {
    if (this.isSubscription && this.subscriptionData) return this.subscriptionData.items || [];
    if (!this.isSubscription && this.orderData) return this.orderData.items || [];
    return [];
  }

  getItemName(item: any): string {
    if (item.product_name) return item.product_name; // from cart/checkout style
    if (item.product_variant && typeof item.product_variant === 'object') {
      return item.product_variant.product_name || 'Product';
    }
    return 'Product';
  }

  getDeliveryAddress(): string {
    if (this.isSubscription && this.subscriptionData) {
      return `${this.subscriptionData.delivery_address}, ${this.subscriptionData.delivery_city}, ${this.subscriptionData.delivery_state} - ${this.subscriptionData.delivery_pincode}`;
    }
    if (!this.isSubscription && this.orderData) {
      return `${this.orderData.delivery_address}, ${this.orderData.delivery_city}, ${this.orderData.delivery_state} - ${this.orderData.delivery_pincode}`;
    }
    return 'Your Address';
  }

  getSubtotal(): number {
    if (!this.isSubscription && this.orderData && (this.orderData.total_price || this.orderData.total)) {
      // Calculate from total if subtotal not provided, assuming -5% GST and delivery charge
      const delivery = Number(this.orderData.delivery_charges || 0);
      const total = Number(this.orderData.total_price || this.orderData.total);
      return (total - delivery) / 0.95;
    }
    if (this.isSubscription && this.subscriptionData) {
      const sub = this.subscriptionData as any;
      const total = Number(sub.total_price || sub.total || sub.amount || 0);
      const delivery = Number(sub.delivery_fee || sub.delivery_charges || 0);
      return (total - delivery) / 0.95;
    }
    return 0;
  }

  getDeliveryCharge(): number {
    if (!this.isSubscription && this.orderData) {
      return Number(this.orderData.delivery_charges || 0);
    }
    if (this.isSubscription && this.subscriptionData) {
      const sub = this.subscriptionData as any;
      return Number(sub.delivery_fee || sub.delivery_charges || 0);
    }
    return 0;
  }

  getGst(): number {
    return -+(this.getSubtotal() * 0.05).toFixed(2);
  }

  getGrandTotal(): number {
    if (!this.isSubscription && this.orderData) return Number(this.orderData.total_price || this.orderData.total || 0);
    if (this.isSubscription && this.subscriptionData) {
      const sub = this.subscriptionData as any;
      return Number(sub.total_price || sub.total || sub.amount || 0);
    }
    return 0;
  }
}
