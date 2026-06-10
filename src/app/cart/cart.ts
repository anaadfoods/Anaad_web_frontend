import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private readonly cdr = inject(ChangeDetectorRef);

  clearingCart = false;

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
}
