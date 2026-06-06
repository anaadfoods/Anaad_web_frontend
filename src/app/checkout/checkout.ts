import { Component, OnInit, PLATFORM_ID, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartState } from '../core/state/cart.state';
import { CartApiService } from '../core/services/cart-api.service';
import { CurrencyInrPipe } from '../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../shared/safe-image.directive';
import { OrderService } from '../core/services/order.service';
import { ProfileService } from '../core/services/profile.service';
import { LocationService } from '../core/services/location.service';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../core/services/product.service';
import { SubscriptionService } from '../core/services/subscription.service';
import { ErrorHandlerService } from '../core/services/error-handler.service';
import { finalize } from 'rxjs/operators';

interface StateOption { id: number; name: string; }

@Component({
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

  constructor() {
    effect(() => {
      // Track items and pin changes
      const items = this.cartState.items();
      const pin = this.checkoutForm?.get('pin')?.value;
      
      // If we have items and a valid pin, trigger calculation
      if (items.length > 0 && pin && pin.length === 6) {
        // Use untracked to avoid triggering effect if calculateCharges somehow modifies tracked signals
        untracked(() => {
          this.calculateCharges(pin);
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

  isSubmitting = false;
  submitError = '';
  loadingProfile = true;
  states = signal<StateOption[]>([]);

  isDirectBuy = false;
  directVariantId: number | null = null;
  directQty = 0;
  directPlanId: number | null = null;
  directTotalPrice = 0;
  directBuyItem = signal<any>(null);

  codCharge = 0;
  prepaidCharge = 0;
  expectedDeliveryDate = '';
  isCalculatingDelivery = false;

  checkoutItems = computed(() => {
    if (this.isDirectBuy) {
      const item = this.directBuyItem();
      return item ? [item] : [];
    }
    return this.cartState.items();
  });

  get f() { return this.checkoutForm.controls; }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['direct_buy'] === 'true') {
        this.isDirectBuy = true;
        this.directVariantId = Number(params['variant_id']);
        this.directQty = Number(params['qty']);
        if (params['plan_id']) {
          this.directPlanId = Number(params['plan_id']);
          // Subscriptions must be online payment (Commented out for COD-only restriction)
          // this.checkoutForm.get('paymentMethod')?.setValue('UPI');
          // COD restriction: Force Cash on Delivery (COD) for subscriptions
          this.checkoutForm.get('paymentMethod')?.setValue('cod');
        }
        this.loadDirectBuyPrice();
      } else if (this.cartState.itemCount() === 0) {
        this.cartSvc.getCart().subscribe({ error: () => undefined });
      }
    });

    this.locationSvc.getStates().subscribe({
      next: (stateList) => this.states.set(stateList),
      error: () => undefined
    });
    this.prefillCheckout();

    this.checkoutForm.get('pin')?.valueChanges.subscribe(val => {
      if (val && val.length === 6 && this.checkoutForm.get('pin')?.valid) {
        this.calculateCharges(val);
      }
    });
  }

  calculateCharges(pincode: string) {
    let items: Array<{ product_variant_id: number; quantity: number }> = [];
    if (this.isDirectBuy) {
      if (this.directVariantId) items = [{ product_variant_id: this.directVariantId, quantity: this.directQty }];
    } else {
      items = this.cartState.items().map(item => ({
        product_variant_id: item.product_variant,
        quantity: item.quantity,
      }));
    }

    if (items.length === 0) return;

    this.isCalculatingDelivery = true;
    const calcItems = items.map(i => ({ product_variant_id: i.product_variant_id, quantity: i.quantity }));
    this.orderSvc.calculateDeliveryCharges(pincode, calcItems).subscribe({
      next: (res) => {
        this.codCharge = res.delivery_charges?.cod ?? 0;
        this.prepaidCharge = res.delivery_charges?.prepaid ?? 0;
        this.expectedDeliveryDate = res.expected_delivery_date;
        this.isCalculatingDelivery = false;
      },
      error: () => {
        this.codCharge = 150; // default
        this.prepaidCharge = 150; // default
        this.isCalculatingDelivery = false;
      }
    });
  }

  loadDirectBuyPrice() {
    if (!this.directVariantId) return;
    this.productSvc.getVariant(this.directVariantId).subscribe({
      next: (v) => {
        let price = parseFloat(v.price) || 0;
        if (this.directPlanId) {
          // If subscription, get the plan discount (we'll fetch plans)
          this.subscriptionSvc.getPlans().subscribe(plans => {
            const plan = plans.find(p => p.id === this.directPlanId);
            if (plan && plan.discount_percentage) {
              const discount = parseFloat(plan.discount_percentage);
              price = price - (price * (discount / 100));
            }
            this.directTotalPrice = price * this.directQty;
            this.directBuyItem.set({
              product_variant: v.id,
              product_name: v.product_name,
              weight: v.weight,
              unit: (v as any).unit || (v as any).weight_unit || '',
              quantity: this.directQty,
              total_price: this.directTotalPrice,
              image: v.images?.[0]?.image || v.product_images?.[0]?.image || ''
            });
          });
        } else {
          this.directTotalPrice = price * this.directQty;
          this.directBuyItem.set({
            product_variant: v.id,
            product_name: v.product_name,
            weight: v.weight,
            unit: (v as any).unit || (v as any).weight_unit || '',
            quantity: this.directQty,
            total_price: this.directTotalPrice,
            image: v.images?.[0]?.image || v.product_images?.[0]?.image || ''
          });
        }
      }
    });
  }

  prefillCheckout() {
    this.loadingProfile = true;
    this.profileSvc.getProfile().pipe(
      finalize(() => this.loadingProfile = false)
    ).subscribe({
      next: profile => {
        this.checkoutForm.patchValue({
          firstName: profile.first_name ?? '',
          lastName: profile.last_name ?? '',
          email: profile.email ?? '',
          phone: profile.phone_number ?? '',
          address: profile.address ?? '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          pin: profile.pincode ?? '',
        });
      },
      error: () => {
        this.orderSvc.getShippingDetails().subscribe({
          next: details => {
            const [firstName, ...restName] = (details.shipping_name ?? '').split(' ');
            this.checkoutForm.patchValue({
              firstName: firstName ?? '',
              lastName: restName.join(' '),
              phone: details.shipping_phone ?? '',
              address: details.shipping_address ?? '',
              city: details.shipping_city ?? '',
              state: details.shipping_state ?? '',
              pin: details.shipping_pincode ?? '',
            });
          },
          error: () => undefined,
        });
      },
    });
  }

  getTotalPrice(): number {
    return this.isDirectBuy ? this.directTotalPrice : this.cartState.totalPrice();
  }

  getDeliveryCharge(): number {
    const pm = this.checkoutForm.value.paymentMethod;
    if (pm === 'cod') return this.codCharge;
    return this.prepaidCharge;
  }

  getGST(): number {
    return +(this.getTotalPrice() * 0.05).toFixed(2);
  }

  getGrandTotal(): number {
    return +(this.getTotalPrice() + this.getGST() + this.getDeliveryCharge()).toFixed(2);
  }

  placeOrder() {
    this.submitError = '';
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      this.submitError = 'Please complete all required fields correctly.';
      return;
    }

    if (!this.isDirectBuy && this.cartState.itemCount() === 0) {
      this.submitError = 'Your cart is empty. Please add items before checking out.';
      return;
    }

    this.isSubmitting = true;
    const val = this.checkoutForm.value;

    const paymentMethod = val.paymentMethod === 'cod' ? 'COD' : 'JUSPAY';
    const deliveryAddress = val.address! + (val.landmark ? `, ${val.landmark}` : '');
    
    let items: Array<{ product_variant_id: number; quantity: number }> = [];
    if (this.isDirectBuy) {
      items = [{ product_variant_id: this.directVariantId!, quantity: this.directQty }];
    } else {
      items = this.cartState.items().map(item => ({
        product_variant_id: item.product_variant,
        quantity: item.quantity,
      }));
    }

    if (this.directPlanId) {
      // Create Subscription
      this.subscriptionSvc.createSubscription({
        plan: this.directPlanId,
        recipient_name: `${val.firstName} ${val.lastName}`.trim(),
        delivery_address: deliveryAddress,
        delivery_city: val.city!,
        delivery_state: val.state!,
        delivery_pincode: val.pin!,
        delivery_phone: val.phone!,
        email: val.email!,
        payment_type: 'PAID_FULL',
        // COD restriction: Force 'COD' instead of online methods
        // payment_method: paymentMethod === 'JUSPAY' ? 'UPI' : 'COD',
        payment_method: 'COD',
        notes: val.notes || undefined,
        delivery_fee: this.getDeliveryCharge(),
        expected_delivery_date: this.expectedDeliveryDate,
        items
      }).subscribe({
        next: (res: any) => {
          this.handleCheckoutSuccess(res);
        },
        error: (err) => this.handleCheckoutError(err)
      });
    } else {
      // Create standard Order
      this.orderSvc.createOrder({
        // COD restriction: Force 'COD' instead of online methods
        // payment_method: paymentMethod === 'JUSPAY' ? 'UPI' : 'COD',
        payment_method: 'COD',
        delivery_address: deliveryAddress,
        delivery_city: val.city!,
        delivery_state: val.state!,
        delivery_pincode: val.pin!,
        delivery_phone: val.phone!,
        recipient_name: `${val.firstName} ${val.lastName}`.trim(),
        email: val.email!,
        notes: val.notes || undefined,
        delivery_fee: this.getDeliveryCharge(),
        expected_delivery_date: this.expectedDeliveryDate,
        items,
      }).subscribe({
        next: (res: any) => {
          this.handleCheckoutSuccess(res);
        },
        error: (err) => this.handleCheckoutError(err)
      });
    }
  }

  private handleCheckoutSuccess(res: any) {
    if (res?.payment_error || res?.payment_required) {
      this.isSubmitting = false;
      this.submitError = "Payment can't be initiated. Please try a different payment method.";
      if (isPlatformBrowser(this.platformId)) {
        window.alert("Payment can't be initiated. Please try a different payment method.");
      }
      return;
    }

    const paymentUrl = res?.payment_links?.web;
    const isSub = !!res?.subscription_id || !!res?.subscription?.id || !!res?.subscription?.subscription_number;
    const orderIdToSave = res?.order?.id || res?.order_id || res?.subscription_id || res?.subscription?.id || res?.id;
    const orderNumberToSave = res?.order?.order_number || res?.order_number || res?.subscription_number || res?.subscription?.subscription_number || res?.id || 'new';

    if (paymentUrl && isPlatformBrowser(this.platformId)) {
      if (orderIdToSave) sessionStorage.setItem('pendingPaymentId', orderIdToSave.toString());
      sessionStorage.setItem('pendingPaymentType', isSub ? 'subscription' : 'order');
      sessionStorage.setItem('pendingPaymentNumber', orderNumberToSave.toString());
      
      if (!this.isDirectBuy) this.cartSvc.clearCart().subscribe();
      window.location.href = paymentUrl;
      return;
    }

    const isCod = this.checkoutForm.value.paymentMethod === 'cod' ? 'true' : 'false';

    if (!this.isDirectBuy) {
      this.cartSvc.clearCart().subscribe({
        next: () => this.router.navigate(['/thank-you'], {
          queryParams: { order: orderNumberToSave, id: orderIdToSave, type: isSub ? 'subscription' : 'order', isCod }
        }),
        error: () => this.router.navigate(['/thank-you']),
      });
    } else {
      this.router.navigate(['/thank-you'], {
        queryParams: { order: orderNumberToSave, id: orderIdToSave, type: isSub ? 'subscription' : 'order', isCod }
      });
    }
  }

  private handleCheckoutError(err: any) {
    this.isSubmitting = false;
    this.submitError = this.errorSvc.parseError(err);
  }
}
