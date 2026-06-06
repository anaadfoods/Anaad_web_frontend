import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
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
  selector: 'app-thank-you',
  standalone: true,
  imports: [CommonModule, CurrencyInrPipe, SafeImageDirective],
  templateUrl: './thank-you.component.html',
  styleUrl: './thank-you.component.scss'
})
export class ThankYouComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly authState = inject(AuthState);
  private readonly orderSvc = inject(OrderService);
  private readonly subSvc = inject(SubscriptionService);
  private readonly platformId = inject(PLATFORM_ID);

  orderNumber = '';
  orderId: number | null = null;
  isSubscription = false;
  paymentStatus = 'Checking status...';
  isPolling = false;
  
  orderData: Order | null = null;
  subscriptionData: Subscription | null = null;

  ngOnInit() {
    console.log('[DEBUG] [ThankYouComponent] ngOnInit initialized');

    this.route.queryParams.subscribe(params => {
      console.log('[DEBUG] [ThankYouComponent] Query parameters received:', params);
      let storedId = params['id'] || null;
      let storedType = params['type'] || null;
      let storedNumber = params['order'] || params['order_id'] || null;
      
      if (isPlatformBrowser(this.platformId)) {
        if (!storedId) storedId = sessionStorage.getItem('pendingPaymentId');
        if (!storedType) storedType = sessionStorage.getItem('pendingPaymentType');
        if (!storedNumber) storedNumber = sessionStorage.getItem('pendingPaymentNumber');

        console.log('[DEBUG] [ThankYouComponent] sessionStorage fallback values:', {
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
      
      console.log('[DEBUG] [ThankYouComponent] Evaluated class properties:', {
        orderId: this.orderId,
        isSubscription: this.isSubscription,
        orderNumber: this.orderNumber
      });

      const isCod = params['isCod'] === 'true';
      
      if (this.orderId) {
        if (isCod) {
          console.log('[DEBUG] [ThankYouComponent] Cash on Delivery detected. No polling needed.');
          this.paymentStatus = 'Order Confirmed (Cash on Delivery)';
          this.fetchOrderDetails();
        } else {
          console.log('[DEBUG] [ThankYouComponent] Online payment detected. Initiating status polling.');
          this.pollPaymentStatus();
        }
      } else {
        console.warn('[DEBUG] [ThankYouComponent] No order ID detected. Setting default order confirmation message.');
        this.paymentStatus = 'Order Confirmed';
      }
    });
  }

  pollPaymentStatus() {
    if (!this.orderId || !isPlatformBrowser(this.platformId)) {
      console.warn('[DEBUG] [ThankYouComponent] Skipping poll: orderId is null or not in browser platform.');
      return;
    }
    this.isPolling = true;
    this.paymentStatus = 'Verifying your payment...';
    
    let attempts = 0;
    console.log('[DEBUG] [ThankYouComponent] Starting pollPaymentStatus loop...');

    timer(0, 3000).pipe(
      switchMap(() => {
        attempts++;
        if (this.isSubscription) {
          const url = `/api/payments/subscription-status/${this.orderId!}/`;
          console.log(`[DEBUG] [ThankYouComponent] Polling attempt #${attempts} | GET: ${url}`);
          return this.subSvc.getPaymentStatus(this.orderId!).pipe(
            catchError(err => {
              console.error(`[DEBUG] [ThankYouComponent] Polling error on attempt #${attempts}:`, err);
              return of(null);
            })
          );
        } else {
          const url = `/api/payments/status/${this.orderId!}/`;
          console.log(`[DEBUG] [ThankYouComponent] Polling attempt #${attempts} | GET: ${url}`);
          return this.orderSvc.getPaymentStatus(this.orderId!).pipe(
            catchError(err => {
              console.error(`[DEBUG] [ThankYouComponent] Polling error on attempt #${attempts}:`, err);
              return of(null);
            })
          );
        }
      }),
      takeWhile(res => {
        console.log(`[DEBUG] [ThankYouComponent] Polling attempt #${attempts} response details:`, res);
        if (!res) return true;
        const pStatus = res.payment_status;
        const tStatus = res.transaction_status;
        
        console.log(`[DEBUG] [ThankYouComponent] Status check: payment_status=${pStatus}, transaction_status=${tStatus}`);

        // Keep polling if state is pending/initiated
        if (this.isSubscription) {
          if (tStatus === 'SUCCESS' || tStatus === 'ACTIVE' || tStatus === 'FAILED') {
            console.log(`[DEBUG] [ThankYouComponent] Reached final subscription state: ${tStatus}. Stopping poll.`);
            return false;
          }
        } else {
          if (pStatus === 'PAID' && tStatus === 'SUCCESS') {
            console.log(`[DEBUG] [ThankYouComponent] Reached final paid order state: ${pStatus}/${tStatus}. Stopping poll.`);
            return false;
          }
          if (tStatus === 'FAILED') {
            console.log(`[DEBUG] [ThankYouComponent] Reached failed order state: ${tStatus}. Stopping poll.`);
            return false;
          }
        }
        return true;
      }, true)
    ).subscribe(res => {
      console.log('[DEBUG] [ThankYouComponent] Polling subscription finished. Final response resolved:', res);
      const isSuccess = this.isSubscription
        ? (res?.transaction_status === 'SUCCESS' || res?.transaction_status === 'ACTIVE')
        : (res?.payment_status === 'PAID' && res?.transaction_status === 'SUCCESS');

      console.log('[DEBUG] [ThankYouComponent] Verification result flag:', { isSuccess });

      if (isSuccess) {
        this.paymentStatus = 'Payment Successful! Redirecting...';
        this.isPolling = false;
        console.log(`[DEBUG] [ThankYouComponent] Success. Navigating to details screen: /${this.isSubscription ? 'subscriptions' : 'orders'}/${this.orderId}`);
        if (this.isSubscription) {
          this.router.navigate(['/subscriptions', this.orderId]);
        } else {
          this.router.navigate(['/orders', this.orderId]);
        }
      } else {
        console.warn('[DEBUG] [ThankYouComponent] Verification resolved to failure or timed out.');
        this.paymentStatus = 'Payment check completed with pending status or failed. Your order is saved—you can check it in your profile.';
        this.isPolling = false;
        this.fetchOrderDetails();
      }
    });
  }

  fetchOrderDetails() {
    if (!this.orderId || !isPlatformBrowser(this.platformId)) return;
    if (this.isSubscription) {
      this.subSvc.getSubscriptionById(this.orderId).subscribe({
        next: (sub) => { this.subscriptionData = sub; }
      });
    } else {
      this.orderSvc.getOrderById(this.orderId).subscribe({
        next: (ord) => { this.orderData = ord; }
      });
    }
  }

  continueShopping() { this.router.navigate(['/products']); }
  viewOrders() { this.router.navigate(['/profile']); }

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
      // Calculate from total if subtotal not provided, assuming 5% GST and delivery charge
      const delivery = Number(this.orderData.delivery_charges || 0);
      const total = Number(this.orderData.total_price || this.orderData.total);
      return (total - delivery) / 1.05;
    }
    return 0; // We might not have subtotal easily available on subscription
  }

  getDeliveryCharge(): number {
    if (!this.isSubscription && this.orderData) {
      return Number(this.orderData.delivery_charges || 0);
    }
    return 0; // Subscriptions usually have free shipping or it's included
  }

  getGst(): number {
    return this.getSubtotal() * 0.05;
  }

  getGrandTotal(): number {
    if (!this.isSubscription && this.orderData) return Number(this.orderData.total_price || this.orderData.total || 0);
    return 0; // Or from subscription status amount
  }
}
