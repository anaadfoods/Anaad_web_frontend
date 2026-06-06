import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartState } from '../core/state/cart.state';
import { CartApiService } from '../core/services/cart-api.service';
import { AuthState } from '../core/state/auth.state';
import { CurrencyInrPipe } from '../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../shared/safe-image.directive';
import { QtySelectorComponent } from '../shared/components/qty-selector/qty-selector.component';
import { ToastService } from '../core/services/toast.service';
import { OrderService } from '../core/services/order.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CurrencyInrPipe, SafeImageDirective, QtySelectorComponent],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
})
export class Cart implements OnInit {
  readonly cartState = inject(CartState);
  readonly authState = inject(AuthState);
  private readonly cartSvc = inject(CartApiService);
  private readonly toastSvc = inject(ToastService);
  private readonly orderSvc = inject(OrderService);

  clearingCart = false;
  pincode = '';
  deliveryCharge: number | null = null;
  deliveryChargesObj: { cod?: number, prepaid?: number } | null = null;
  expectedDeliveryDate = '';
  calculatingDelivery = false;
  deliveryError = '';

  ngOnInit() {
    // Reload cart from server on page load if authenticated
    if (this.authState.isAuthenticated()) {
      this.cartSvc.getCart().subscribe({ error: () => undefined });
    }
  }

  updateQuantity(productVariantId: number, qty: number) {
    if (qty <= 0) {
      this.removeItem(productVariantId);
    } else {
      this.cartSvc.updateItem(productVariantId, qty).subscribe({ error: () => undefined });
    }
  }

  removeItem(productVariantId: number) {
    this.cartSvc.removeItem(productVariantId).subscribe({ 
      next: () => {
        this.toastSvc.show('Item removed from cart', 'info');
      },
      error: () => undefined 
    });
  }

  clearCart() {
    this.clearingCart = true;
    this.cartSvc.clearCart().subscribe({
      next: () => { this.clearingCart = false; },
      error: () => { this.clearingCart = false; }
    });
  }

  calculateDelivery() {
    if (this.pincode.length !== 6) {
      this.deliveryError = 'Please enter a valid 6-digit pincode';
      return;
    }
    this.deliveryError = '';
    this.calculatingDelivery = true;
    
    const items = this.cartState.items().map(i => ({ product_variant_id: i.product_variant, quantity: i.quantity }));
    
    this.orderSvc.calculateDeliveryCharges(this.pincode, items).subscribe({
      next: (res) => {
        this.deliveryChargesObj = res.delivery_charges;
        this.deliveryCharge = res.delivery_charges?.cod ?? res.delivery_charges?.prepaid ?? 0;
        this.expectedDeliveryDate = res.expected_delivery_date;
        this.calculatingDelivery = false;
      },
      error: (err) => {
        this.deliveryError = err.error?.error || 'Delivery is not available for this pincode.';
        this.deliveryCharge = null;
        this.deliveryChargesObj = null;
        this.expectedDeliveryDate = '';
        this.calculatingDelivery = false;
      }
    });
  }

  getDeliveryCharge(): number {
    if (this.deliveryCharge !== null) return this.deliveryCharge;
    return this.cartState.totalPrice() >= 1200 ? 0 : 150;
  }

  getGST(): number {
    return +(this.cartState.totalPrice() * 0.05).toFixed(2);
  }

  getGrandTotal(): number {
    return +(this.cartState.totalPrice() + this.getGST() + this.getDeliveryCharge()).toFixed(2);
  }
}
