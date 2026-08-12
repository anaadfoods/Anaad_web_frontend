import { LogService } from '../../core/services/log.service';
import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Order, OrderTracking } from '../../core/models/order.model';
import { OrderService } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../../shared/safe-image.directive';
import { timer, switchMap, takeWhile, catchError, of, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, CurrencyInrPipe, SafeImageDirective, RouterLink],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private readonly logSvc = inject(LogService);
  private readonly orderSvc = inject(OrderService);
  private readonly paymentSvc = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly showApiDeliveryDate = environment.showApiDeliveryDate;
  orderData = signal<Order | null>(null);
  trackingData = signal<OrderTracking | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');
  activeTab = signal<'details' | 'tracking'>('details');
  retryPaymentLoading = signal<boolean>(false);

  showCancelModal = signal<boolean>(false);
  selectedCancelReason = signal<string>('');
  customCancelReason = signal<string>('');
  readonly cancelReasons = [
    'I found a better price elsewhere.',
    'I am moving to a different city and no longer need this.',
    'No longer need the products / changed my mind.',
    'Delivery is taking too long / scheduling issues.',
    'Other (Please specify)'
  ];

  showCancelResultModal = signal<boolean>(false);
  cancelResultData = signal<{
    title: string;
    message: string;
    refundInitiated: boolean;
    orderNumber?: string;
  } | null>(null);

  isVerifyingPayment = signal<boolean>(false);
  verificationMessage = signal<string>('');
  private pollSub?: Subscription;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.route.params.subscribe(params => {
        const orderId = params['id'];
        if (orderId) {
          this.loadOrderDetails(orderId);
        }
      });
    }
  }

  loadOrderDetails(orderId: string | number) {
    this.loading.set(true);
    this.error.set('');

    this.orderSvc.getOrderById(Number(orderId)).subscribe({
      next: (order) => {
        this.orderData.set(order);
        
        // Start payment verification only for online (non-COD) orders with pending status
        if (order.payment_method !== 'COD') {
          if (order.order_number) {
            this.verifyPaymentStatus(order.order_number);
          } else {
            this.verifyPaymentStatus(order.id.toString());
          }
        }

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
        this.logSvc.error('Error loading order:', err);
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
    this.selectedCancelReason.set('');
    this.customCancelReason.set('');
    this.showCancelModal.set(true);
  }

  cancelOrderConfirmed() {
    const order = this.orderData();
    if (!order) return;

    let reason = this.selectedCancelReason();
    if (reason === 'Other (Please specify)') {
      reason = this.customCancelReason().trim();
      if (!reason) {
        alert('Please write your reason for cancellation.');
        return;
      }
    } else if (!reason) {
      alert('Please select a reason for cancellation.');
      return;
    }

    this.showCancelModal.set(false);
    this.orderSvc.cancelOrder(order.id, reason).subscribe({
      next: (res) => {
        this.cancelResultData.set({
          title: 'Order Cancelled',
          message: res.message || 'Your order cancellation request has been submitted successfully.',
          refundInitiated: res.refund_initiated ?? false,
          orderNumber: res.order_number || order.order_number
        });
        this.showCancelResultModal.set(true);
        this.loadOrderDetails(order.id.toString());
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.error?.detail || 'Failed to cancel order. Please try again.';
        alert(errorMsg);
      }
    });
  }

  closeCancelResultModal() {
    this.showCancelResultModal.set(false);
    this.cancelResultData.set(null);
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
        const paymentUrl = res.checkout_url;
        const orderNumber = res.order_number || order.order_number || order.id.toString();
        
        if (res.success && paymentUrl) {
          sessionStorage.setItem('pendingPaymentId', order.id.toString());
          sessionStorage.setItem('pendingPaymentType', 'order');
          sessionStorage.setItem('pendingPaymentNumber', orderNumber);
          if (res.merchant_transaction_id) {
            sessionStorage.setItem('pendingMerchantTransactionId', res.merchant_transaction_id);
          }
          window.location.href = paymentUrl;
        } else {
          alert(res.error || 'Failed to initiate payment. Please try again.');
        }
      },
      error: (err) => {
        this.retryPaymentLoading.set(false);
        this.logSvc.error('Error initiating payment retry:', err);
        alert('An error occurred while initiating payment. Please try again later.');
      }
    });
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
  }

  verifyPaymentStatus(orderNumber: string) {
    const order = this.orderData();
    if (!order) {
      this.logSvc.warn('[DEBUG] [OrderDetail] verifyPaymentStatus called but orderData is null');
      return;
    }

    const orderId = order.id;
    const isPendingInSession = sessionStorage.getItem('pendingPaymentId') === orderId.toString() &&
                               sessionStorage.getItem('pendingPaymentType') === 'order';

    const isPending = order.payment_status === 'PENDING_PAYMENT' || order.payment_status === 'PENDING';

    this.logSvc.debug('[DEBUG] [OrderDetail] Evaluating order status for verification:', {
      orderId,
      orderNumber,
      payment_status: order.payment_status,
      isPending,
      isPendingInSession,
      session_pendingPaymentId: sessionStorage.getItem('pendingPaymentId'),
      session_pendingPaymentType: sessionStorage.getItem('pendingPaymentType')
    });

    if (!isPending && !isPendingInSession) {
      this.logSvc.debug('[DEBUG] [OrderDetail] Order is not pending/initiated in database or session. Skipping status verification.');
      return;
    }

    this.isVerifyingPayment.set(true);
    this.verificationMessage.set('Confirming payment status...');

    let attempts = 0;
    const maxAttempts = 10;
    this.logSvc.debug(`[DEBUG] [OrderDetail] Starting payment verification polling loop. Max attempts: ${maxAttempts}`);

    if (this.pollSub) {
      this.logSvc.debug('[DEBUG] [OrderDetail] Unsubscribing previous polling subscription.');
      this.pollSub.unsubscribe();
    }

    this.pollSub = timer(0, 2500).pipe(
      switchMap(() => {
        attempts++;
        this.logSvc.debug(`[DEBUG] [OrderDetail] Polling attempt #${attempts} | reference: ${orderNumber}`);
        return this.orderSvc.getPaymentStatus(orderNumber).pipe(
          catchError(err => {
            this.logSvc.error(`[DEBUG] [OrderDetail] Polling error on attempt #${attempts}:`, err);
            return of(null);
          })
        );
      }),
      takeWhile(res => {
        this.logSvc.debug(`[DEBUG] [OrderDetail] Polling attempt #${attempts} response details:`, res);
        if (!res) {
          if (attempts >= maxAttempts) {
            this.logSvc.warn('[DEBUG] [OrderDetail] Polling failed: No response and max attempts reached');
            return false;
          }
          return true;
        }
        
        const tStatus = res.transaction_status?.toUpperCase();

        this.logSvc.debug(`[DEBUG] [OrderDetail] Status check: transaction_status=${tStatus}`);

        if (tStatus === 'SUCCESS') {
          this.logSvc.debug('[DEBUG] [OrderDetail] Reached final success state. Stopping poll.');
          return false;
        }
        if (tStatus === 'FAILED' || tStatus === 'CANCELLED' || tStatus === 'ABANDONED') {
          this.logSvc.debug('[DEBUG] [OrderDetail] Reached terminal failure state. Stopping poll.');
          return false;
        }
        
        if (attempts >= maxAttempts) {
          this.logSvc.warn('[DEBUG] [OrderDetail] Stopped polling: Max attempts reached without final status.');
          return false;
        }
        return true;
      }, true)
    ).subscribe({
      next: (res: any) => {
        this.logSvc.debug('[DEBUG] [OrderDetail] Polling subscription finished. Final response resolved:', res);
        const tStatus = res?.transaction_status?.toUpperCase();
        const isSuccess = tStatus === 'SUCCESS';
        
        this.logSvc.debug('[DEBUG] [OrderDetail] Verification result flag:', { isSuccess });

        if (isSuccess) {
          this.logSvc.debug('[DEBUG] [OrderDetail] Payment successful. Clearing session keys & reloading order detail...');
          this.isVerifyingPayment.set(false);
          sessionStorage.removeItem('pendingPaymentId');
          sessionStorage.removeItem('pendingPaymentType');
          sessionStorage.removeItem('pendingPaymentNumber');
          sessionStorage.removeItem('pendingMerchantTransactionId');
          // Disable loading and reload details
          this.loading.set(true);
          this.orderSvc.getOrderById(orderId).subscribe({
            next: (newOrder) => {
              this.logSvc.debug('[DEBUG] [OrderDetail] Order details reloaded successfully:', newOrder);
              this.orderData.set(newOrder);
              this.loading.set(false);
            },
            error: (err) => {
              this.logSvc.error('[DEBUG] [OrderDetail] Failed to reload order details after success:', err);
              this.loading.set(false);
            }
          });
        } else if (attempts >= maxAttempts || (tStatus && tStatus !== 'PENDING' && tStatus !== 'INITIATED')) {
          this.logSvc.warn('[DEBUG] [OrderDetail] Verification finished without success. Clearing session keys.');
          this.isVerifyingPayment.set(false);
          sessionStorage.removeItem('pendingPaymentId');
          sessionStorage.removeItem('pendingPaymentType');
          sessionStorage.removeItem('pendingPaymentNumber');
          sessionStorage.removeItem('pendingMerchantTransactionId');
          this.loading.set(true);
          this.orderSvc.getOrderById(orderId).subscribe({
            next: (newOrder) => {
              this.orderData.set(newOrder);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
            }
          });
        }
      },
      error: (err) => {
        this.logSvc.error('[DEBUG] [OrderDetail] Polling subscription crashed:', err);
        this.isVerifyingPayment.set(false);
      }
    });
  }
}
