// ============================================
// Cart State Service
// Manages cart state with signals + server sync
// ============================================

import { computed, inject, Injectable, signal } from '@angular/core';
import { Cart, CartItem, EMPTY_CART } from '../models/cart.model';
import { StorageService, STORAGE_KEYS } from '../utils/storage.utils';

@Injectable({ providedIn: 'root' })
export class CartState {
  private readonly storage = inject(StorageService);

  // ── Signals ───────────────────────────────
  private readonly _cart = signal<Cart>(EMPTY_CART);
  private readonly _loading = signal<boolean>(false);
  private readonly _toastMessage = signal<string>('');

  // ── Computed ──────────────────────────────
  readonly cart = this._cart.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly toastMessage = this._toastMessage.asReadonly();
  readonly items = computed(() => this._cart().items);
  readonly itemCount = computed(() => this._cart().total_items);
  readonly totalPrice = computed(() => parseFloat(this._cart().total_price));
  readonly estimatedTax = computed(() => +(this.totalPrice() * 0.05).toFixed(2));
  readonly deliveryCharge = computed(() => this.totalPrice() > 1200 || this.isEmpty() ? 0 : 150);
  readonly grandTotal = computed(() => +(this.totalPrice() + this.estimatedTax() + this.deliveryCharge()).toFixed(2));
  readonly isEmpty = computed(() => this._cart().total_items === 0);

  constructor() {
    // Hydrate cached cart from localStorage (optimistic display)
    const cached = this.storage.getJSON<Cart>(STORAGE_KEYS.CART_CACHE);
    if (cached) {
      this._cart.set(cached);
    }
  }

  // ── Actions ───────────────────────────────

  setCart(cart: Cart): void {
    this._cart.set(cart);
    this.storage.setJSON(STORAGE_KEYS.CART_CACHE, cart);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  showToast(message: string): void {
    this._toastMessage.set(message);
    setTimeout(() => this._toastMessage.set(''), 3000);
  }

  /** Optimistic add — update local state before server confirms */
  optimisticAdd(item: CartItem): void {
    const current = this._cart();
    const existingIndex = current.items.findIndex(
      i => i.product_variant === item.product_variant
    );

    let updatedItems: CartItem[];
    if (existingIndex >= 0) {
      updatedItems = [...current.items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + item.quantity,
        total_price: (
          parseFloat(updatedItems[existingIndex].total_price) +
          parseFloat(item.total_price)
        ).toFixed(2),
      };
    } else {
      updatedItems = [...current.items, item];
    }

    const newTotal = updatedItems.reduce(
      (sum, i) => sum + parseFloat(i.total_price), 0
    );

    this.setCart({
      ...current,
      items: updatedItems,
      total_items: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
      total_price: newTotal.toFixed(2),
    });
  }

  /** Optimistic remove */
  optimisticRemove(productVariantId: number): void {
    const current = this._cart();
    const updatedItems = current.items.filter(
      i => i.product_variant !== productVariantId
    );
    const newTotal = updatedItems.reduce(
      (sum, i) => sum + parseFloat(i.total_price), 0
    );
    this.setCart({
      ...current,
      items: updatedItems,
      total_items: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
      total_price: newTotal.toFixed(2),
    });
  }

  /** Optimistic quantity update */
  optimisticUpdateQuantity(productVariantId: number, quantity: number): void {
    const current = this._cart();
    const updatedItems = current.items.map(item => {
      if (item.product_variant !== productVariantId) return item;
      const unitPrice = parseFloat(item.price);
      return {
        ...item,
        quantity,
        total_price: (unitPrice * quantity).toFixed(2),
      };
    });
    const newTotal = updatedItems.reduce(
      (sum, i) => sum + parseFloat(i.total_price), 0
    );
    this.setCart({
      ...current,
      items: updatedItems,
      total_items: updatedItems.reduce((sum, i) => sum + i.quantity, 0),
      total_price: newTotal.toFixed(2),
    });
  }

  /** Clear cart (after checkout or explicit clear) */
  clear(): void {
    this.setCart(EMPTY_CART);
    this.storage.removeItem(STORAGE_KEYS.CART_CACHE);
  }

  /** Get item quantity by variant ID */
  getItemQuantity(productVariantId: number): number {
    const item = this._cart().items.find(
      i => i.product_variant === productVariantId
    );
    return item?.quantity ?? 0;
  }
}
