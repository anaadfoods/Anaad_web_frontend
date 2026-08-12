import { LogService } from '../../core/services/log.service';
import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, SubscriptionPaymentStatus as PaymentStatus } from '../../core/models/subscription.model';
import { SubscriptionService } from '../../core/services/subscription.service';
import { PaymentService } from '../../core/services/payment.service';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../../shared/safe-image.directive';
import { timer, switchMap, takeWhile, catchError, of, Subscription as RxSubscription } from 'rxjs';
import { environment } from '../../../environments/environment';

interface SubscriptionInvoice {
  id: number;
  odoo_invoice_number?: string;
  invoice_number?: string;
  s3_url: string;
  display_name: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-subscription-detail',
  standalone: true,
  imports: [CommonModule, CurrencyInrPipe, RouterLink, FormsModule],
  templateUrl: './subscription-detail.component.html',
  styleUrls: ['./subscription-detail.component.scss']
})
export class SubscriptionDetailComponent implements OnInit, OnDestroy {
  private readonly logSvc = inject(LogService);
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paymentSvc = inject(PaymentService);

  protected readonly showApiDeliveryDate = environment.showApiDeliveryDate;
  subscriptionData = signal<Subscription | null>(null);
  paymentStatus = signal<PaymentStatus | null>(null);
  invoices = signal<SubscriptionInvoice[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  activeTab = signal<'overview' | 'items' | 'payments' | 'invoices'>('overview');
  pauseStartDate = '';
  pauseEndDate = '';
  showPauseForm = signal<boolean>(false);
  showCancelModal = signal<boolean>(false);
  selectedCancelReason = signal<string>('');
  customCancelReason = signal<string>('');
  readonly cancelReasons = [
    'I am moving to a different city and no longer need this.',
    'I found a better price elsewhere.',
    'Delivery is taking too long / scheduling issues.',
    'Quality or product selection concerns.',
    'Other (Please specify)'
  ];

  showCancelResultModal = signal<boolean>(false);
  cancelResultData = signal<{
    title: string;
    message: string;
    refundInitiated: boolean;
    subscriptionNumber?: string;
  } | null>(null);
  pauseLoading = signal<boolean>(false);

  isVerifyingPayment = signal<boolean>(false);
  verificationMessage = signal<string>('');
  private pollSub?: RxSubscription;

  ngOnInit() {
    this.route.params.subscribe(params => {
      const subscriptionId = params['id'];
      if (subscriptionId) {
        this.loadSubscriptionDetails(subscriptionId);
      }
    });
  }

  loadSubscriptionDetails(subscriptionId: string | number) {
    this.loading.set(true);
    this.error.set('');

    this.subscriptionSvc.getSubscriptionById(Number(subscriptionId)).subscribe({
      next: (subscription) => {
        this.subscriptionData.set(subscription);
        
        // Start payment verification only for online (non-COD) subscriptions with pending status
        if (subscription.payment_method !== 'COD') {
          if (subscription.subscription_number) {
            this.verifyPaymentStatus(subscription.subscription_number);
          } else {
            this.verifyPaymentStatus(subscription.id.toString());
          }
        }

        // Load payment status
        this.loadPaymentStatus(Number(subscriptionId));
        // Load invoices
        this.loadInvoices(Number(subscriptionId));
      },
      error: (err) => {
        this.error.set('Failed to load subscription details');
        this.loading.set(false);
        this.logSvc.error('Error loading subscription:', err);
      }
    });
  }

  loadPaymentStatus(subscriptionId: number) {
    this.subscriptionSvc.getSubscriptionPaymentStatus(subscriptionId).subscribe({
      next: (status) => {
        this.paymentStatus.set(status);
      },
      error: () => {
        // Payment status might not be available
      }
    });
  }

  loadInvoices(subscriptionId: number) {
    this.subscriptionSvc.getSubscriptionInvoices(subscriptionId).subscribe({
      next: (response: any) => {
        if (response?.invoices) {
          const mappedInvoices = response.invoices.map((inv: any) => ({
            ...inv,
            odoo_invoice_number: inv.invoice_number || inv.odoo_invoice_number || ''
          }));
          this.invoices.set(mappedInvoices);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  pauseSubscription() {
    const subscription = this.subscriptionData();
    if (!subscription) return;

    this.pauseLoading.set(true);
    const pauseData = this.pauseStartDate && this.pauseEndDate ? {
      pause_start_date: this.pauseStartDate,
      pause_end_date: this.pauseEndDate
    } : undefined;

    this.subscriptionSvc.pauseSubscription(subscription.id, pauseData).subscribe({
      next: (response: any) => {
        alert('Subscription paused successfully');
        this.showPauseForm.set(false);
        this.pauseStartDate = '';
        this.pauseEndDate = '';
        this.loadSubscriptionDetails(subscription.id.toString());
      },
      error: () => {
        alert('Failed to pause subscription');
        this.pauseLoading.set(false);
      }
    });
  }

  resumeSubscription() {
    const subscription = this.subscriptionData();
    if (!subscription) return;

    if (confirm('Are you sure you want to resume this subscription?')) {
      this.subscriptionSvc.pauseSubscription(subscription.id).subscribe({
        next: () => {
          alert('Subscription resumed successfully');
          this.loadSubscriptionDetails(subscription.id.toString());
        },
        error: () => {
          alert('Failed to resume subscription');
        }
      });
    }
  }

  cancelSubscription() {
    this.selectedCancelReason.set('');
    this.customCancelReason.set('');
    this.showCancelModal.set(true);
  }

  cancelSubscriptionConfirmed() {
    const subscription = this.subscriptionData();
    if (!subscription) return;

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
    this.subscriptionSvc.cancelSubscription(subscription.id, reason).subscribe({
      next: (res) => {
        this.cancelResultData.set({
          title: 'Subscription Cancelled',
          message: res.message || 'Your subscription cancellation has been processed successfully.',
          refundInitiated: res.refund_initiated ?? false,
          subscriptionNumber: res.subscription_number || subscription.subscription_number || subscription.id.toString()
        });
        this.showCancelResultModal.set(true);
        this.loadSubscriptionDetails(subscription.id.toString());
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.error?.detail || 'Failed to cancel subscription. Please try again.';
        alert(errorMsg);
      }
    });
  }

  closeCancelResultModal() {
    this.showCancelResultModal.set(false);
    this.cancelResultData.set(null);
  }

  payNextInstallment() {
    const subscription = this.subscriptionData();
    if (!subscription) return;

    this.subscriptionSvc.payNextInstallment(subscription.id).subscribe({
      next: (response: any) => {
        const paymentUrl = response?.checkout_url;
        const subNumber = response?.subscription_number || subscription.subscription_number || subscription.id.toString();
        
        if (paymentUrl) {
          sessionStorage.setItem('pendingPaymentId', subscription.id.toString());
          sessionStorage.setItem('pendingPaymentType', 'subscription');
          sessionStorage.setItem('pendingPaymentNumber', subNumber);
          if (response?.merchant_transaction_id) {
            sessionStorage.setItem('pendingMerchantTransactionId', response.merchant_transaction_id);
          }
          window.location.href = paymentUrl;
        } else {
          alert(response?.error || 'Failed to initiate payment. Please try again.');
        }
      },
      error: () => {
        alert('Failed to initiate payment');
      }
    });
  }

  downloadInvoice(invoiceUrl: string) {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
    }
  }

  getOrderItemName(item: any): string {
    if (!item) return 'Product';
    if (typeof item.product_variant === 'object' && item.product_variant !== null) {
      return item.product_variant.product_name || 'Product';
    }
    return 'Product';
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'ACTIVE': '#28a745',
      'PAUSED': '#ffc107',
      'CANCELLED': '#dc3545',
      'PENDING': '#17a2b8',
      'EXPIRED': '#6c757d'
    };
    return colorMap[status] || '#999999';
  }

  getPaymentStatusDisplay(): string {
    const status = this.paymentStatus();
    if (!status) return 'UNKNOWN';
    if (this.subscriptionData()?.payment_type === 'INSTALLMENT' && status.installment_payment_status) {
      return status.installment_payment_status;
    }
    return status.payment_status;
  }

  getDurationLabel(months: number | undefined): string {
    if (!months) return '-';
    return months === 1 ? '1 Month' : `${months} Months`;
  }

  getPlanName(): string {
    const sub = this.subscriptionData();
    if (!sub) return 'Subscription';
    if (sub.plan_name) return sub.plan_name;
    if (typeof sub.plan === 'object' && sub.plan !== null) {
      return sub.plan.name;
    }
    return `Plan #${sub.plan}`;
  }

  getSubscriptionDuration(): string {
    const sub = this.subscriptionData();
    if (!sub) return '-';
    if (typeof sub.plan === 'object' && sub.plan !== null) {
      return this.getDurationLabel(sub.plan.duration_months);
    }
    return '-';
  }

  canPause(): boolean {
    const status = this.subscriptionData()?.status;
    return status === 'ACTIVE';
  }

  canResume(): boolean {
    const status = this.subscriptionData()?.status;
    return status === 'PAUSED';
  }

  canCancel(): boolean {
    const status = this.subscriptionData()?.status;
    return status === 'ACTIVE' || status === 'PAUSED';
  }

  canPayInstallment(): boolean {
    // COD restriction: Installments are disabled. Enforce full payment, hide the pay installment button.
    // const status = this.paymentStatus();
    // return status?.installment_payment_status === 'PENDING';
    return false;
  }

  getPendingDeliveries(): number {
    const sub = this.subscriptionData();
    if (!sub) return 0;
    const total = sub.total_deliveries ?? 0;
    const completed = sub.completed_deliveries ?? 0;
    const pending = total - completed;
    return pending > 0 ? pending : 0;
  }

  formatDate(date: string | undefined | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getMonthlyDeliveryCharge(): number {
    const sub = this.subscriptionData();
    if (!sub) return 0;
    if (sub.delivery_charges !== undefined) return parseFloat(sub.delivery_charges as any) || 0;
    return (sub as any).delivery_fee || 0;
  }

  getSubscriptionDurationMonths(): number {
    const sub = this.subscriptionData();
    if (!sub) return 1;
    if (sub.total_deliveries) return sub.total_deliveries; // Assuming 1 delivery per month for this calculation if no plan details
    if (typeof sub.plan === 'object' && sub.plan !== null) {
      return (sub.plan as any).duration_months || 1;
    }
    return 1;
  }

  getTotalAmount(): number {
    const pStatus = this.paymentStatus();
    if (pStatus && pStatus.amount) {
      return parseFloat(pStatus.amount);
    }
    const sub = this.subscriptionData();
    if (!sub) return 0;
    if (sub.total !== undefined) return parseFloat(sub.total as any) || 0;
    return (sub as any).total_amount || 0;
  }

  getTotalDeliveryCost(): number {
    const sub = this.subscriptionData();
    if (!sub) return 0;
    if (sub.total_delivery_charges !== undefined) return parseFloat(sub.total_delivery_charges as any) || 0;
    return this.getMonthlyDeliveryCharge() * this.getSubscriptionDurationMonths();
  }

  getTotalItemCost(): number {
    const sub = this.subscriptionData();
    if (!sub) return 0;
    if (sub.subtotal !== undefined) return parseFloat(sub.subtotal as any) || 0;

    const total = this.getTotalAmount();
    const totalDelivery = this.getTotalDeliveryCost();
    const itemCost = total - totalDelivery;
    return itemCost > 0 ? itemCost : 0;
  }

  getMonthlyItemCost(): number {
    const sub = this.subscriptionData();
    if (!sub) return 0;
    if (sub.items && sub.items.length > 0) {
       let cost = 0;
       for (const item of sub.items) {
           cost += (parseFloat(item.discounted_price as any) || parseFloat(item.price as any) || 0) * item.quantity;
       }
       if (cost > 0) return cost;
    }
    return this.getTotalItemCost() / this.getSubscriptionDurationMonths();
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
  }

  verifyPaymentStatus(subscriptionNumber: string) {
    const sub = this.subscriptionData();
    if (!sub) {
      this.logSvc.warn('[DEBUG] [SubscriptionDetail] verifyPaymentStatus called but subscriptionData is null');
      return;
    }

    const subscriptionId = sub.id;
    const isPendingInSession = sessionStorage.getItem('pendingPaymentId') === subscriptionId.toString() &&
                               sessionStorage.getItem('pendingPaymentType') === 'subscription';

    const isPending = sub.payment_status === 'PENDING' || sub.payment_status === 'UNPAID';

    this.logSvc.debug('[DEBUG] [SubscriptionDetail] Evaluating subscription status for verification:', {
      subscriptionId,
      subscriptionNumber,
      payment_status: sub.payment_status,
      isPending,
      isPendingInSession,
      session_pendingPaymentId: sessionStorage.getItem('pendingPaymentId'),
      session_pendingPaymentType: sessionStorage.getItem('pendingPaymentType')
    });

    if (!isPending && !isPendingInSession) {
      this.logSvc.debug('[DEBUG] [SubscriptionDetail] Subscription is not pending/unpaid in database or session. Skipping status verification.');
      return;
    }

    this.isVerifyingPayment.set(true);
    this.verificationMessage.set('Confirming subscription payment...');

    let attempts = 0;
    const maxAttempts = 10;
    this.logSvc.debug(`[DEBUG] [SubscriptionDetail] Starting payment verification polling loop. Max attempts: ${maxAttempts}`);

    if (this.pollSub) {
      this.logSvc.debug('[DEBUG] [SubscriptionDetail] Unsubscribing previous polling subscription.');
      this.pollSub.unsubscribe();
    }

    this.pollSub = timer(0, 2500).pipe(
      switchMap(() => {
        attempts++;
        this.logSvc.debug(`[DEBUG] [SubscriptionDetail] Polling attempt #${attempts} | reference: ${subscriptionNumber}`);
        return this.subscriptionSvc.getPaymentStatus(subscriptionNumber).pipe(
          catchError(err => {
            this.logSvc.error(`[DEBUG] [SubscriptionDetail] Polling error on attempt #${attempts}:`, err);
            return of(null);
          })
        );
      }),
      takeWhile(res => {
        this.logSvc.debug(`[DEBUG] [SubscriptionDetail] Polling attempt #${attempts} response details:`, res);
        if (!res) {
          if (attempts >= maxAttempts) {
            this.logSvc.warn('[DEBUG] [SubscriptionDetail] Polling failed: No response and max attempts reached');
            return false;
          }
          return true;
        }

        const tStatus = res.transaction_status?.toUpperCase();
        this.logSvc.debug(`[DEBUG] [SubscriptionDetail] Status check: transaction_status=${tStatus}`);

        if (tStatus === 'SUCCESS' || tStatus === 'ACTIVE') {
          this.logSvc.debug(`[DEBUG] [SubscriptionDetail] Reached final subscription state: ${tStatus}. Stopping poll.`);
          return false;
        }
        if (tStatus === 'FAILED' || tStatus === 'CANCELLED' || tStatus === 'ABANDONED') {
          this.logSvc.debug(`[DEBUG] [SubscriptionDetail] Reached terminal failure state: ${tStatus}. Stopping poll.`);
          return false;
        }

        if (attempts >= maxAttempts) {
          this.logSvc.warn('[DEBUG] [SubscriptionDetail] Stopped polling: Max attempts reached without final status.');
          return false;
        }
        return true;
      }, true)
    ).subscribe({
      next: (res: any) => {
        this.logSvc.debug('[DEBUG] [SubscriptionDetail] Polling subscription finished. Final response resolved:', res);
        const tStatus = res?.transaction_status?.toUpperCase();
        const isSuccess = tStatus === 'SUCCESS' || tStatus === 'ACTIVE';

        this.logSvc.debug('[DEBUG] [SubscriptionDetail] Verification result flag:', { isSuccess });

        if (isSuccess) {
          this.logSvc.debug('[DEBUG] [SubscriptionDetail] Payment successful. Clearing session keys & reloading subscription details...');
          this.isVerifyingPayment.set(false);
          sessionStorage.removeItem('pendingPaymentId');
          sessionStorage.removeItem('pendingPaymentType');
          sessionStorage.removeItem('pendingPaymentNumber');
          sessionStorage.removeItem('pendingMerchantTransactionId');
          
          this.loading.set(true);
          this.subscriptionSvc.getSubscriptionById(subscriptionId).subscribe({
            next: (newSub) => {
              this.logSvc.debug('[DEBUG] [SubscriptionDetail] Subscription details reloaded successfully:', newSub);
              this.subscriptionData.set(newSub);
              this.loadPaymentStatus(subscriptionId);
              this.loadInvoices(subscriptionId);
            },
            error: (err) => {
              this.logSvc.error('[DEBUG] [SubscriptionDetail] Failed to reload subscription details:', err);
              this.loading.set(false);
            }
          });
        } else if (attempts >= maxAttempts || (tStatus && tStatus !== 'PENDING' && tStatus !== 'INITIATED')) {
          this.logSvc.warn('[DEBUG] [SubscriptionDetail] Verification finished without success. Clearing session keys.');
          this.isVerifyingPayment.set(false);
          sessionStorage.removeItem('pendingPaymentId');
          sessionStorage.removeItem('pendingPaymentType');
          sessionStorage.removeItem('pendingPaymentNumber');
          sessionStorage.removeItem('pendingMerchantTransactionId');
          this.loading.set(true);
          this.subscriptionSvc.getSubscriptionById(subscriptionId).subscribe({
            next: (newSub) => {
              this.subscriptionData.set(newSub);
              this.loadPaymentStatus(subscriptionId);
              this.loadInvoices(subscriptionId);
            },
            error: () => {
              this.loading.set(false);
            }
          });
        }
      },
      error: (err) => {
        this.logSvc.error('[DEBUG] [SubscriptionDetail] Polling subscription crashed:', err);
        this.isVerifyingPayment.set(false);
      }
    });
  }
}
