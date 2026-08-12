import { Component, OnInit, PLATFORM_ID, inject, signal, computed, effect, untracked, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith, Subscription as RxSubscription } from 'rxjs';
import { CartState } from '../core/state/cart.state';
import { CartApiService } from '../core/services/cart-api.service';
import { CurrencyInrPipe } from '../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../shared/safe-image.directive';
import { OrderService } from '../core/services/order.service';
import { ProfileService } from '../core/services/profile.service';
import { LocationService } from '../core/services/location.service';
import { ProductService } from '../core/services/product.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { SubscriptionPlan } from '../core/models/subscription.model';
import { ErrorHandlerService } from '../core/services/error-handler.service';
import { PaymentService } from '../core/services/payment.service';
import { finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface StateOption { id: number; name: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CurrencyInrPipe, SafeImageDirective],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss'],
})
export class Checkout implements OnInit {
  readonly cartState = inject(CartState);
  private readonly cartSvc = inject(CartApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly orderSvc = inject(OrderService);
  private readonly profileSvc = inject(ProfileService);
  private readonly locationSvc = inject(LocationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly productSvc = inject(ProductService);
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly errorSvc = inject(ErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly paymentSvc = inject(PaymentService);

  constructor() {
    effect(() => {
      // Track items and pin changes
      const items = this.checkoutItems();
      const pin = this.pinCode();
      const isPinValid = this.checkoutForm.get('pin')?.valid;

      // If we have items and a valid pin, trigger calculation
      if (items.length > 0 && pin && pin.length === 6 && isPinValid) {
        untracked(() => {
          this.calculateCharges(pin);
        });
      }
    });

    effect(() => {
      const plan = this.selectedPlan();
      if (!plan || !plan.allows_installments) {
        untracked(() => {
          this.selectedPaymentType.set('PAID_FULL');
        });
      }
    });
  }

  checkoutForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern('^[+]?[0-9]{10,13}$')]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    landmark: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    pin: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    paymentMethod: ['cod'],
    notes: ['']
  });

  readonly isSubmitting = signal<boolean>(false);
  readonly submitError = signal<string>('');
  readonly loadingProfile = signal<boolean>(true);
  readonly states = signal<StateOption[]>([]);

  readonly isDirectBuy = signal<boolean>(false);
  readonly directVariantId = signal<number | null>(null);
  readonly directQty = signal<number>(0);
  readonly directPlanId = signal<number | null>(null);
  readonly directTotalPrice = signal<number>(0);
  readonly directBuyItem = signal<any>(null);

  readonly codCharge = signal<number>(0);
  readonly prepaidCharge = signal<number>(0);
  readonly expectedDeliveryDate = signal<string>('');
  readonly showApiDeliveryDate = environment.showApiDeliveryDate;
  readonly deliveryDateMessage = computed(() => {
    if (this.showApiDeliveryDate) {
      return this.expectedDeliveryDate() || 'â€”';
    } else {
      return 'delivery will be start from Aug 2026 first week';
    }
  });
  readonly isCalculatingDelivery = signal<boolean>(false);

  // Convert Form control value changes to a signal
  readonly pinCode = toSignal(
    this.checkoutForm.get('pin')!.valueChanges.pipe(
      startWith(this.checkoutForm.get('pin')!.value)
    ),
    { initialValue: '' }
  );

  readonly checkoutItems = computed(() => {
    if (this.isDirectBuy()) {
      const item = this.directBuyItem();
      return item ? [item] : [];
    }
    return this.cartState.items();
  });

  readonly subtotal = computed(() => {
    return this.isDirectBuy() ? this.directTotalPrice() : this.cartState.totalPrice();
  });

  readonly deliveryCharge = computed(() => {
    const method = this.checkoutForm.get('paymentMethod')?.value;
    return method === 'cod' ? this.codCharge() : this.prepaidCharge();
  });

  readonly gst = computed(() => {
    return 0;
  });

  readonly selectedPlan = signal<SubscriptionPlan | null>(null);
  readonly selectedPaymentType = signal<'PAID_FULL' | 'INSTALLMENT'>('PAID_FULL');

  readonly isSubscription = computed(() => !!this.directPlanId());
  readonly discountedPricePerMonth = computed(() => this.subtotal());
  readonly deliveryChargePerMonth = computed(() => this.deliveryCharge());
  readonly planDurationMonths = computed(() => this.selectedPlan()?.duration_months ?? 1);
  readonly totalItemCost = computed(() => this.discountedPricePerMonth() * this.planDurationMonths());
  readonly totalDeliveryCost = computed(() => this.deliveryChargePerMonth() * this.planDurationMonths());
  readonly totalAmount = computed(() => this.totalItemCost() + this.totalDeliveryCost());

  readonly grandTotal = computed(() => {
    if (this.isSubscription()) {
      if (this.selectedPaymentType() === 'INSTALLMENT') {
        return this.discountedPricePerMonth() + this.deliveryChargePerMonth();
      }
      return this.totalAmount();
    }
    return +(this.subtotal() + this.deliveryCharge()).toFixed(2);
  });

  get f() { return this.checkoutForm.controls; }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['direct_buy'] === 'true') {
        this.isDirectBuy.set(true);
        this.directVariantId.set(Number(params['variant_id']));
        this.directQty.set(Number(params['qty']));
        if (params['plan_id']) {
          this.directPlanId.set(Number(params['plan_id']));
          this.checkoutForm.get('paymentMethod')?.setValue('cod');
          if (params['payment_type'] === 'INSTALLMENT' || params['payment_type'] === 'PAID_FULL') {
            this.selectedPaymentType.set(params['payment_type']);
          }
        }
        this.loadDirectBuyPrice();
      } else if (this.cartState.itemCount() === 0) {
        this.cartSvc.getCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
      }
    });

    this.locationSvc.getStates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (stateList) => {
        this.states.set(stateList);
      },
      error: () => undefined
    });
    this.prefillCheckout();

    // Push dummy state to capture browser back button
    if (isPlatformBrowser(this.platformId)) {
      history.pushState(null, '', window.location.href);
    }
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: any) {
    const tab = this.isSubscription() ? 'subscriptions' : 'orders';
    this.router.navigate(['/profile'], { queryParams: { tab } });
  }

  calculateCharges(pincode: string) {
    let items: Array<{ product_variant_id: number; quantity: number }> = [];
    if (this.isDirectBuy()) {
      const variantId = this.directVariantId();
      if (variantId) items = [{ product_variant_id: variantId, quantity: this.directQty() }];
    } else {
      items = this.cartState.items().map(item => ({
        product_variant_id: item.product_variant,
        quantity: item.quantity,
      }));
    }

    if (items.length === 0) return;

    this.isCalculatingDelivery.set(true);
    const calcItems = items.map(i => ({ product_variant_id: i.product_variant_id, quantity: i.quantity }));
    this.orderSvc.calculateDeliveryCharges(pincode, calcItems).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => {
        this.codCharge.set(res.delivery_charges?.cod ?? 0);
        this.prepaidCharge.set(res.delivery_charges?.prepaid ?? 0);
        this.expectedDeliveryDate.set(res.expected_delivery_date || '');
        this.isCalculatingDelivery.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.codCharge.set(150); // default
        this.prepaidCharge.set(150); // default
        this.isCalculatingDelivery.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadDirectBuyPrice() {
    const variantId = this.directVariantId();
    if (!variantId) return;
    this.productSvc.getVariant(variantId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (v) => {
        let price = parseFloat(v.price) || 0;
        const planId = this.directPlanId();
        if (planId) {
          // If subscription, get the plan discount (we'll fetch plans)
          this.subscriptionSvc.getPlans().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(plans => {
            const plan = plans.find(p => p.id === planId);
            if (plan) this.selectedPlan.set(plan);

            this.subscriptionSvc.getPlanPricesByVariant(v.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(prices => {
              const planPriceObj = prices.find(p => p.plan_id === planId);
              if (planPriceObj) {
                price = planPriceObj.discounted_price;
              } else if (plan) {
                const discount = plan.total_discount_percentage || 0;
                price = price * (1 - discount / 100);
              }
              this.directTotalPrice.set(price * this.directQty());
              this.directBuyItem.set({
                product_variant: v.id,
                product_name: v.product_name,
                weight: v.weight,
                unit: (v as any).unit || (v as any).weight_unit || '',
                quantity: this.directQty(),
                total_price: this.directTotalPrice(),
                image: v.images?.[0]?.image || v.product_images?.[0]?.image || ''
              });
              this.cdr.markForCheck();
            });
          });
        } else {
          this.directTotalPrice.set(price * this.directQty());
          this.directBuyItem.set({
            product_variant: v.id,
            product_name: v.product_name,
            weight: v.weight,
            unit: (v as any).unit || (v as any).weight_unit || '',
            quantity: this.directQty(),
            total_price: this.directTotalPrice(),
            image: v.images?.[0]?.image || v.product_images?.[0]?.image || ''
          });
          this.cdr.markForCheck();
        }
      }
    });
  }

  showAddressModal = signal<boolean>(false);
  savingAddressModal = signal<boolean>(false);

  closeAddressModal() {
    this.showAddressModal.set(false);
    this.location.back();
  }

  addressModalForm = this.fb.group({
    address: ['', [Validators.required, Validators.minLength(5)]],
    city: ['', Validators.required],
    state: ['', Validators.required],
    pin: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
  });

  private formatState(state: string | undefined | null): string {
    if (!state) return '';
    return state.trim().toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private checkPincodeAfterPrefill() {
    const pin = this.checkoutForm.get('pin')?.value;
    if (!pin || pin.length !== 6 || this.checkoutForm.get('pin')?.invalid) {
      if (this.isSubscription()) {
        this.showAddressModal.set(true);
      }
    }
  }

  saveAddressModal() {
    if (this.addressModalForm.invalid) {
      this.addressModalForm.markAllAsTouched();
      return;
    }
    this.savingAddressModal.set(true);
    const val = this.addressModalForm.value;

    const formattedState = this.formatState(val.state);

    this.checkoutForm.patchValue({
      address: val.address,
      city: val.city,
      state: formattedState,
      pin: val.pin
    });

    const currentProfile = this.checkoutForm.value;
    this.profileSvc.updateProfile({
      username: currentProfile.email || 'user',
      first_name: currentProfile.firstName || '',
      last_name: currentProfile.lastName || '',
      email: currentProfile.email || '',
      phone_number: currentProfile.phone || '',
      address: val.address!,
      city: val.city!,
      state: formattedState!,
      pincode: val.pin!
    }).subscribe({
      next: () => {
        this.savingAddressModal.set(false);
        this.showAddressModal.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingAddressModal.set(false);
        this.showAddressModal.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  prefillCheckout() {
    this.loadingProfile.set(true);
    this.profileSvc.getProfile().pipe(
      finalize(() => {
        this.loadingProfile.set(false);
        this.cdr.markForCheck();
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: profile => {
        this.checkoutForm.patchValue({
          firstName: profile.first_name ?? '',
          lastName: profile.last_name ?? '',
          email: profile.email ?? '',
          phone: profile.phone_number ?? '',
          address: profile.address ?? '',
          city: profile.city ?? '',
          state: this.formatState(profile.state),
          pin: profile.pincode ?? '',
        });
        this.checkPincodeAfterPrefill();
        this.cdr.markForCheck();
      },
      error: () => {
        this.orderSvc.getShippingDetails().pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: details => {
            const [firstName, ...restName] = (details.shipping_name ?? '').split(' ');
            this.checkoutForm.patchValue({
              firstName: firstName ?? '',
              lastName: restName.join(' '),
              phone: details.shipping_phone ?? '',
              address: details.shipping_address ?? '',
              city: details.shipping_city ?? '',
              state: this.formatState(details.shipping_state),
              pin: details.shipping_pincode ?? '',
            });
            this.checkPincodeAfterPrefill();
            this.cdr.markForCheck();
          },
          error: () => {
            this.checkPincodeAfterPrefill();
            this.cdr.markForCheck();
          },
        });
      },
    });
  }

  getTotalPrice(): number {
    return this.subtotal();
  }

  getDeliveryCharge(): number {
    return this.deliveryCharge();
  }

  getGST(): number {
    return 0;
  }

  getGrandTotal(): number {
    return this.grandTotal();
  }

  placeOrder() {
    this.submitError.set('');
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.submitError.set('Please complete all required fields correctly.');
      return;
    }

    if (!this.isDirectBuy() && this.cartState.itemCount() === 0) {
      this.submitError.set('Your cart is empty. Please add items before checking out.');
      return;
    }

    this.isSubmitting.set(true);
    const val = this.checkoutForm.value;

    const paymentMethod: 'COD' | 'UPI' = val.paymentMethod === 'cod' ? 'COD' : 'UPI';
    const deliveryAddress = val.address! + (val.landmark ? `, ${val.landmark}` : '');

    let items: Array<{ product_variant_id: number; quantity: number }> = [];
    if (this.isDirectBuy()) {
      const variantId = this.directVariantId();
      if (variantId) items = [{ product_variant_id: variantId, quantity: this.directQty() }];
    } else {
      items = this.cartState.items().map(item => ({
        product_variant_id: item.product_variant,
        quantity: item.quantity,
      }));
    }

    const planId = this.directPlanId();
    if (planId) {
      // Create Subscription
      this.subscriptionSvc.createSubscription({
        plan: planId,
        recipient_name: `${val.firstName} ${val.lastName}`.trim(),
        delivery_address: deliveryAddress,
        delivery_city: val.city!,
        delivery_state: val.state!,
        delivery_pincode: val.pin!,
        delivery_phone: val.phone!,
        email: val.email!,
        payment_type: this.selectedPaymentType(),
        payment_method: paymentMethod,
        notes: val.notes || undefined,
        delivery_fee: this.getDeliveryCharge(),
        expected_delivery_date: this.expectedDeliveryDate(),
        items
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res: any) => {
          this.handleCheckoutSuccess(res);
        },
        error: (err) => this.handleCheckoutError(err)
      });
    } else {
      // Create standard Order
      this.orderSvc.createOrder({
        payment_method: paymentMethod,
        delivery_address: deliveryAddress,
        delivery_city: val.city!,
        delivery_state: val.state!,
        delivery_pincode: val.pin!,
        delivery_phone: val.phone!,
        recipient_name: `${val.firstName} ${val.lastName}`.trim(),
        email: val.email!,
        notes: val.notes || undefined,
        delivery_fee: this.getDeliveryCharge(),
        expected_delivery_date: this.expectedDeliveryDate(),
        items,
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res: any) => {
          this.handleCheckoutSuccess(res);
        },
        error: (err) => this.handleCheckoutError(err)
      });
    }
  }

  private handleCheckoutSuccess(res: any) {
    if (res?.payment_error || res?.payment_required) {
      this.isSubmitting.set(false);
      this.submitError.set("Payment can't be initiated. Please try a different payment method.");
      if (isPlatformBrowser(this.platformId)) {
        window.alert("Payment can't be initiated. Please try a different payment method.");
      }
      return;
    }

    const paymentUrl = res?.checkout_url;
    const isSub = !!this.directPlanId() || !!res?.subscription_number || !!res?.subscription_id || !!res?.subscription?.id || !!res?.subscription?.subscription_number || (res?.id && res?.subscription_number);
    const orderIdToSave = res?.order?.id || res?.order_id || res?.subscription_id || res?.subscription?.id || res?.id || '';
    const orderNumberToSave = res?.order_number || res?.subscription_number || res?.order?.order_number || res?.subscription?.subscription_number || res?.id || '';
    const merchantTxnId = res?.merchant_transaction_id;

    if (paymentUrl && isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('pendingPaymentId', orderIdToSave.toString());
      sessionStorage.setItem('pendingPaymentType', isSub ? 'subscription' : 'order');
      sessionStorage.setItem('pendingPaymentNumber', orderNumberToSave.toString());
      if (merchantTxnId) {
        sessionStorage.setItem('pendingMerchantTransactionId', merchantTxnId);
      }

      if (!this.isDirectBuy()) {
        this.cartSvc.clearCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.openPaymentGateway(paymentUrl),
          error: () => this.openPaymentGateway(paymentUrl)
        });
      } else {
        this.openPaymentGateway(paymentUrl);
      }
      return;
    }

    const route = isSub ? ['/subscription', orderIdToSave] : ['/order', orderIdToSave];

    if (!this.isDirectBuy()) {
      this.cartSvc.clearCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => this.router.navigate(route),
        error: () => this.router.navigate(route),
      });
    } else {
      this.router.navigate(route);
    }
  }

  private openPaymentGateway(url: string) {
    window.location.href = url;
  }

  private handleCheckoutError(err: any) {
    this.isSubmitting.set(false);
    this.submitError.set(this.errorSvc.parseError(err));
  }
}
