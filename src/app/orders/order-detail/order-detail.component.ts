import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Order, OrderTracking } from '../../core/models/order.model';
import { OrderService } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../../shared/safe-image.directive';
import { timer, switchMap, takeWhile, catchError, of, Subscription } from 'rxjs';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, CurrencyInrPipe, SafeImageDirective, RouterLink],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private readonly orderSvc = inject(OrderService);
  private readonly paymentSvc = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);

  orderData = signal<Order | null>(null);
  trackingData = signal<OrderTracking | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');
  activeTab = signal<'details' | 'tracking'>('details');
  retryPaymentLoading = signal<boolean>(false);

  isVerifyingPayment = signal<boolean>(false);
  verificationMessage = signal<string>('');
  private pollSub?: Subscription;

  ngOnInit() {
    this.route.params.subscribe(params => {
      const orderId = params['id'];
      if (orderId) {
        this.loadOrderDetails(orderId);
      }
    });
  }

  loadOrderDetails(orderId: string | number) {
    this.loading.set(true);
    this.error.set('');

    this.orderSvc.getOrderById(Number(orderId)).subscribe({
      next: (order) => {
        this.orderData.set(order);
        
        // Check and verify payment status dynamically if it's pending
        this.verifyPaymentStatus(order.id);

        // Load tracking info if order number is available
        if (order.order_number) {
          this.loadTracking(order.order_number);
        } else {
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set('Failed to load order details');
        this.loading.set(false);
        console.error('Error loading order:', err);
      }
    });
  }

  loadTracking(orderNumber: string) {
    this.orderSvc.getOrderTracking(orderNumber).subscribe({
      next: (tracking) => {
        this.trackingData.set(tracking);
        this.loading.set(false);
      },
      error: () => {
        // Tracking might not be available yet, that's ok
        this.loading.set(false);
      }
    });
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'PENDING': '#FFA500',
      'CONFIRMED': '#4169E1',
      'PROCESSING': '#FF6347',
      'SHIPPED': '#32CD32',
      'DELIVERED': '#228B22',
      'CANCELLED': '#DC143C',
      'CANCEL_REQUESTED': '#FF8C00',
      'RETURNED': '#FF1493'
    };
    return colorMap[status] || '#999999';
  }

  getPaymentStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'PAID': '✓',
      'UNPAID': '✕',
      'PENDING': '⏳',
      'SUCCESS': '✓',
      'FAILED': '✕',
      'REFUNDED': '↩'
    };
    return iconMap[status] || '?';
  }

  cancelOrder() {
    const order = this.orderData();
    if (!order) return;

    if (confirm('Are you sure you want to cancel this order?')) {
      this.orderSvc.cancelOrder(order.id).subscribe({
        next: () => {
          alert('Cancellation request submitted successfully');
          this.loadOrderDetails(order.id.toString());
        },
        error: () => {
          alert('Failed to cancel order');
        }
      });
    }
  }

  downloadInvoice() {
    const order = this.orderData();
    if (!order) return;

    this.orderSvc.downloadInvoice(order.order_number).subscribe({
      next: (response: any) => {
        if (response?.invoice?.s3_url) {
          window.open(response.invoice.s3_url, '_blank');
        }
      },
      error: () => {
        alert('Failed to download invoice');
      }
    });
  }

  canCancelOrder(): boolean {
    const order = this.orderData();
    return order?.status === 'PENDING' || order?.status === 'CONFIRMED';
  }

  getItemName(item: any): string {
    return item.product_name ?? item.product_details?.product_name ?? 'Product';
  }

  getItemVariant(item: any): string {
    if (item.variant_name) return item.variant_name;
    const details = item.product_details;
    if (details && details.weight) {
      return `${details.weight} ${details.weight_unit || ''}`.trim();
    }
    return '';
  }

  getItemImage(item: any): string {
    if (item.image) return item.image;
    const details = item.product_details;
    if (details?.product_images?.length) {
      return details.product_images[0].image || '';
    }
    return '';
  }

  getItemPrice(item: any): string {
    return item.price ?? item.product_details?.final_price ?? item.product_details?.price ?? '0.00';
  }

  getItemTotalPrice(item: any): string {
    return item.total_price ?? item.total ?? '0.00';
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    let parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      // Try parsing DD-MM-YYYY
      const match = date.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
      if (match) {
        const [_, day, month, year, hour = '00', minute = '00'] = match;
        parsedDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
      }
    }
    if (isNaN(parsedDate.getTime())) return date;
    return parsedDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canRetryPayment(): boolean {
    const order = this.orderData();
    if (!order) return false;
    return order.payment_method !== 'COD' && 
           order.status !== 'CANCELLED' && 
           (order.payment_status === 'PENDING_PAYMENT' || order.payment_status === 'FAILED' || order.payment_status === 'PENDING');
  }

  retryPayment() {
    const order = this.orderData();
    if (!order) return;

    this.retryPaymentLoading.set(true);
    this.paymentSvc.initiatePayment({ order_id: order.id }).subscribe({
      next: (res) => {
        this.retryPaymentLoading.set(false);
        if (res.success && res.payment_links?.web) {
          sessionStorage.setItem('pendingPaymentId', order.id.toString());
          sessionStorage.setItem('pendingPaymentType', 'order');
          sessionStorage.setItem('pendingPaymentNumber', order.order_number || order.id.toString());
          window.location.href = res.payment_links.web;
        } else {
          alert(res.error || 'Failed to initiate payment. Please try again.');
        }
      },
      error: (err) => {
        this.retryPaymentLoading.set(false);
        console.error('Error initiating payment retry:', err);
        alert('An error occurred while initiating payment. Please try again later.');
      }
    });
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
  }

  verifyPaymentStatus(orderId: number) {
    const isPendingInSession = sessionStorage.getItem('pendingPaymentId') === orderId.toString() &&
                               sessionStorage.getItem('pendingPaymentType') === 'order';

    const order = this.orderData();
    if (!order) {
      console.warn('[DEBUG] [OrderDetail] verifyPaymentStatus called but orderData is null');
      return;
    }

    const isPending = order.payment_status === 'PENDING_PAYMENT' || order.payment_status === 'PENDING';

    console.log('[DEBUG] [OrderDetail] Evaluating order status for verification:', {
      orderId,
      orderNumber: order.order_number,
      payment_status: order.payment_status,
      isPending,
      isPendingInSession,
      session_pendingPaymentId: sessionStorage.getItem('pendingPaymentId'),
      session_pendingPaymentType: sessionStorage.getItem('pendingPaymentType')
    });

    if (!isPending && !isPendingInSession) {
      console.log('[DEBUG] [OrderDetail] Order is not pending/initiated in database or session. Skipping status verification.');
      return;
    }

    this.isVerifyingPayment.set(true);
    this.verificationMessage.set('Confirming payment status...');

    let attempts = 0;
    const maxAttempts = 10;
    console.log(`[DEBUG] [OrderDetail] Starting payment verification polling loop. Max attempts: ${maxAttempts}`);

    if (this.pollSub) {
      console.log('[DEBUG] [OrderDetail] Unsubscribing previous polling subscription.');
      this.pollSub.unsubscribe();
    }

    this.pollSub = timer(0, 2500).pipe(
      switchMap(() => {
        attempts++;
        const url = `/api/payments/status/${orderId}/`;
        console.log(`[DEBUG] [OrderDetail] Polling attempt #${attempts} | GET: ${url}`);
        return this.orderSvc.getPaymentStatus(orderId).pipe(
          catchError(err => {
            console.error(`[DEBUG] [OrderDetail] Polling error on attempt #${attempts}:`, err);
            return of(null);
          })
        );
      }),
      takeWhile(res => {
        console.log(`[DEBUG] [OrderDetail] Polling attempt #${attempts} response details:`, res);
        if (!res) {
          if (attempts >= maxAttempts) {
            console.warn('[DEBUG] [OrderDetail] Polling failed: No response and max attempts reached');
            return false;
          }
          return true;
        }
        
        const pStatus = res.payment_status;
        const tStatus = res.transaction_status;

        console.log(`[DEBUG] [OrderDetail] Status check: payment_status=${pStatus}, transaction_status=${tStatus}`);

        if (pStatus === 'PAID' && tStatus === 'SUCCESS') {
          console.log('[DEBUG] [OrderDetail] Reached final success state. Stopping poll.');
          return false;
        }
        if (tStatus === 'FAILED') {
          console.log('[DEBUG] [OrderDetail] Reached failed state. Stopping poll.');
          return false;
        }
        
        if (attempts >= maxAttempts) {
          console.warn('[DEBUG] [OrderDetail] Stopped polling: Max attempts reached without final status.');
          return false;
        }
        return true;
      }, true)
    ).subscribe({
      next: (res: any) => {
        console.log('[DEBUG] [OrderDetail] Polling subscription finished. Final response resolved:', res);
        const isSuccess = res?.payment_status === 'PAID' && res?.transaction_status === 'SUCCESS';
        
        console.log('[DEBUG] [OrderDetail] Verification result flag:', { isSuccess });

        if (isSuccess) {
          console.log('[DEBUG] [OrderDetail] Payment successful. Clearing session keys & reloading order detail...');
          this.isVerifyingPayment.set(false);
          sessionStorage.removeItem('pendingPaymentId');
          sessionStorage.removeItem('pendingPaymentType');
          sessionStorage.removeItem('pendingPaymentNumber');
          // Disable loading and reload details
          this.loading.set(true);
          this.orderSvc.getOrderById(orderId).subscribe({
            next: (newOrder) => {
              console.log('[DEBUG] [OrderDetail] Order details reloaded successfully:', newOrder);
              this.orderData.set(newOrder);
              this.loading.set(false);
            },
            error: (err) => {
              console.error('[DEBUG] [OrderDetail] Failed to reload order details after success:', err);
              this.loading.set(false);
            }
          });
        } else if (attempts >= maxAttempts || (res && res.transaction_status === 'FAILED')) {
          console.warn('[DEBUG] [OrderDetail] Verification finished without success. Clearing session keys.');
          this.isVerifyingPayment.set(false);
          sessionStorage.removeItem('pendingPaymentId');
          sessionStorage.removeItem('pendingPaymentType');
          sessionStorage.removeItem('pendingPaymentNumber');
        }
      },
      error: (err) => {
        console.error('[DEBUG] [OrderDetail] Polling subscription crashed:', err);
        this.isVerifyingPayment.set(false);
      }
    });
  }
}
