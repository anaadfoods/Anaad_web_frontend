import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, SubscriptionPaymentStatus as PaymentStatus } from '../../core/models/subscription.model';
import { SubscriptionService } from '../../core/services/subscription.service';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../../shared/safe-image.directive';
import { timer, switchMap, takeWhile, catchError, of, Subscription as RxSubscription } from 'rxjs';

interface SubscriptionInvoice {
  id: number;
  odoo_invoice_number?: string;
  invoice_number?: string;
  s3_url: string;
  display_name: string;
}

@Component({
  selector: 'app-subscription-detail',
  standalone: true,
  imports: [CommonModule, CurrencyInrPipe, RouterLink, FormsModule],
  templateUrl: './subscription-detail.component.html',
  styleUrls: ['./subscription-detail.component.scss']
})
export class SubscriptionDetailComponent implements OnInit, OnDestroy {
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly route = inject(ActivatedRoute);

  subscriptionData = signal<Subscription | null>(null);
  paymentStatus = signal<PaymentStatus | null>(null);
  invoices = signal<SubscriptionInvoice[]>([]);
  loading = signal<boolean>(true);
  error = signal<string>('');
  activeTab = signal<'overview' | 'items' | 'payments' | 'invoices'>('overview');
  pauseStartDate = '';
  pauseEndDate = '';
  showPauseForm = signal<boolean>(false);
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
        
        // Polling status verify if it's pending
        this.verifyPaymentStatus(subscription.id);

        // Load payment status
        this.loadPaymentStatus(Number(subscriptionId));
        // Load invoices
        this.loadInvoices(Number(subscriptionId));
      },
      error: (err) => {
        this.error.set('Failed to load subscription details');
        this.loading.set(false);
        console.error('Error loading subscription:', err);
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
    const subscription = this.subscriptionData();
    if (!subscription) return;

    if (confirm('Are you sure you want to cancel this subscription? This action cannot be undone.')) {
      this.subscriptionSvc.cancelSubscription(subscription.id).subscribe({
        next: () => {
          alert('Subscription cancelled successfully');
          this.loadSubscriptionDetails(subscription.id.toString());
        },
        error: () => {
          alert('Failed to cancel subscription');
        }
      });
    }
  }

  payNextInstallment() {
    const subscription = this.subscriptionData();
    if (!subscription) return;

    this.subscriptionSvc.payNextInstallment(subscription.id).subscribe({
      next: (response: any) => {
        if (response?.payment_links?.web) {
          sessionStorage.setItem('pendingPaymentId', subscription.id.toString());
          sessionStorage.setItem('pendingPaymentType', 'subscription');
          sessionStorage.setItem('pendingPaymentNumber', subscription.subscription_number || subscription.id.toString());
          window.location.href = response.payment_links.web;
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

  formatDate(date: string | undefined | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  ngOnDestroy() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
    }
  }

  verifyPaymentStatus(subscriptionId: number) {
    const isPendingInSession = sessionStorage.getItem('pendingPaymentId') === subscriptionId.toString() &&
                               sessionStorage.getItem('pendingPaymentType') === 'subscription';

    const sub = this.subscriptionData();
    if (!sub) {
      console.warn('[DEBUG] [SubscriptionDetail] verifyPaymentStatus called but subscriptionData is null');
      return;
    }

    const isPending = sub.payment_status === 'PENDING' || sub.payment_status === 'UNPAID';

    console.log('[DEBUG] [SubscriptionDetail] Evaluating subscription status for verification:', {
      subscriptionId,
      subscriptionNumber: sub.subscription_number,
      payment_status: sub.payment_status,
      isPending,
      isPendingInSession,
      session_pendingPaymentId: sessionStorage.getItem('pendingPaymentId'),
      session_pendingPaymentType: sessionStorage.getItem('pendingPaymentType')
    });

    if (!isPending && !isPendingInSession) {
      console.log('[DEBUG] [SubscriptionDetail] Subscription is not pending/unpaid in database or session. Skipping status verification.');
      return;
    }

    this.isVerifyingPayment.set(true);
    this.verificationMessage.set('Confirming subscription payment...');

    let attempts = 0;
    const maxAttempts = 10;
    console.log(`[DEBUG] [SubscriptionDetail] Starting payment verification polling loop. Max attempts: ${maxAttempts}`);

    if (this.pollSub) {
      console.log('[DEBUG] [SubscriptionDetail] Unsubscribing previous polling subscription.');
      this.pollSub.unsubscribe();
    }

    this.pollSub = timer(0, 2500).pipe(
      switchMap(() => {
        attempts++;
        const url = `/api/payments/subscription-status/${subscriptionId}/`;
        console.log(`[DEBUG] [SubscriptionDetail] Polling attempt #${attempts} | GET: ${url}`);
        return this.subscriptionSvc.getSubscriptionPaymentStatus(subscriptionId).pipe(
          catchError(err => {
            console.error(`[DEBUG] [SubscriptionDetail] Polling error on attempt #${attempts}:`, err);
            return of(null);
          })
        );
      }),
      takeWhile(res => {
        console.log(`[DEBUG] [SubscriptionDetail] Polling attempt #${attempts} response details:`, res);
        if (!res) {
          if (attempts >= maxAttempts) {
            console.warn('[DEBUG] [SubscriptionDetail] Polling failed: No response and max attempts reached');
            return false;
          }
          return true;
        }

        const tStatus = res.transaction_status;
        console.log(`[DEBUG] [SubscriptionDetail] Status check: transaction_status=${tStatus}`);

        if (tStatus === 'SUCCESS' || tStatus === 'ACTIVE' || tStatus === 'FAILED') {
          console.log(`[DEBUG] [SubscriptionDetail] Reached final subscription state: ${tStatus}. Stopping poll.`);
          return false;
        }

        if (attempts >= maxAttempts) {
          console.warn('[DEBUG] [SubscriptionDetail] Stopped polling: Max attempts reached without final status.');
          return false;
        }
        return true;
      }, true)
    ).subscribe({
      next: (res: any) => {
        console.log('[DEBUG] [SubscriptionDetail] Polling subscription finished. Final response resolved:', res);
        const isSuccess = res?.transaction_status === 'SUCCESS' || res?.transaction_status === 'ACTIVE';

        console.log('[DEBUG] [SubscriptionDetail] Verification result flag:', { isSuccess });

        if (isSuccess) {
          console.log('[DEBUG] [SubscriptionDetail] Payment successful. Clearing session keys & reloading subscription details...');
          this.isVerifyingPayment.set(false);
          sessionStorage.removeItem('pendingPaymentId');
          sessionStorage.removeItem('pendingPaymentType');
          sessionStorage.removeItem('pendingPaymentNumber');
          
          this.loading.set(true);
          this.subscriptionSvc.getSubscriptionById(subscriptionId).subscribe({
            next: (newSub) => {
              console.log('[DEBUG] [SubscriptionDetail] Subscription details reloaded successfully:', newSub);
              this.subscriptionData.set(newSub);
              this.loadPaymentStatus(subscriptionId);
              this.loadInvoices(subscriptionId);
            },
            error: (err) => {
              console.error('[DEBUG] [SubscriptionDetail] Failed to reload subscription details:', err);
              this.loading.set(false);
            }
          });
        } else if (attempts >= maxAttempts || (res && res.transaction_status === 'FAILED')) {
          console.warn('[DEBUG] [SubscriptionDetail] Verification finished without success. Clearing session keys.');
          this.isVerifyingPayment.set(false);
          sessionStorage.removeItem('pendingPaymentId');
          sessionStorage.removeItem('pendingPaymentType');
          sessionStorage.removeItem('pendingPaymentNumber');
        }
      },
      error: (err) => {
        console.error('[DEBUG] [SubscriptionDetail] Polling subscription crashed:', err);
        this.isVerifyingPayment.set(false);
      }
    });
  }
}
