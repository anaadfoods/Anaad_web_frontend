// ============================================
// Cart API Service
// Handles server-side cart operations
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, tap, throwError } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { CartState } from '../state/cart.state';
import {
  Cart,
  AddCartItemRequest,
  UpdateCartItemRequest,
  RemoveCartItemRequest,
} from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly http = inject(HttpClient);
  private readonly cartState = inject(CartState);

  private extractData(res: any): any {
    let current = res;
    while (current && current.data && typeof current.data === 'object' && !Array.isArray(current.data)) {
      current = current.data;
    }
    if (current && Array.isArray(current.data)) {
      return current.data;
    }
    if (current && Array.isArray(current.results)) {
      return current.results;
    }
    return current;
  }

  /** Fetch full cart from server */
  getCart(): Observable<Cart> {
    this.cartState.setLoading(true);
    return this.http.get<Cart>(API.CART.DETAILS).pipe(
      map(res => this.normalizeCart(this.extractData(res))),
      tap(cart => {
        this.cartState.setCart(cart);
      }),
      finalize(() => this.cartState.setLoading(false))
    );
  }

  addItem(productVariant: number, quantity: number = 1): Observable<Cart> {
    const previous = this.cartState.cart();
    const body: AddCartItemRequest = { product_variant_id: productVariant, quantity };
    return this.http.post<Cart>(API.CART.ADD, body).pipe(
      map(res => {
        const data = this.extractData(res);
        if (!data || data.items === undefined) return this.cartState.cart();
        return this.normalizeCart(data);
      }),
      tap(cart => this.cartState.setCart(cart)),
      catchError(error => {
        this.cartState.setCart(previous);
        return throwError(() => error);
      })
    );
  }

  /** Update item quantity */
  updateItem(productVariant: number, quantity: number): Observable<Cart> {
    const previous = this.cartState.cart();
    this.cartState.optimisticUpdateQuantity(productVariant, quantity);
    const body: UpdateCartItemRequest = { product_variant_id: productVariant, quantity };
    return this.http.post<Cart>(API.CART.UPDATE, body).pipe(
      map(res => {
        const data = this.extractData(res);
        if (!data || data.items === undefined) return this.cartState.cart();
        return this.normalizeCart(data);
      }),
      tap(cart => this.cartState.setCart(cart)),
      catchError(error => {
        this.cartState.setCart(previous);
        return throwError(() => error);
      })
    );
  }

  /** Remove item from cart */
  removeItem(productVariant: number): Observable<Cart> {
    const previous = this.cartState.cart();
    this.cartState.optimisticRemove(productVariant);
    const body: RemoveCartItemRequest = { product_variant_id: productVariant };
    return this.http.post<Cart>(API.CART.REMOVE, body).pipe(
      map(res => {
        const data = this.extractData(res);
        if (!data || data.items === undefined) return this.cartState.cart();
        return this.normalizeCart(data);
      }),
      tap(cart => this.cartState.setCart(cart)),
      catchError(error => {
        this.cartState.setCart(previous);
        return throwError(() => error);
      })
    );
  }

  /** Clear entire cart */
  clearCart(): Observable<Cart> {
    return this.http.post<Cart>(API.CART.CLEAR, {}).pipe(
      map(res => {
        const data = this.extractData(res);
        if (!data || data.items === undefined) {
           return { ...this.cartState.cart(), items: [], total_items: 0, total_price: '0.00' };
        }
        return this.normalizeCart(data);
      }),
      tap(cart => {
        if (cart.items.length) {
          this.cartState.setCart(cart);
        } else {
          this.cartState.clear();
        }
      })
    );
  }

  /** Sync cart on login (fetch server cart and merge) */
  syncOnLogin(): void {
    this.getCart().subscribe({
      error: () => {
        // If cart fetch fails, keep local cache
        this.cartState.setLoading(false);
      }
    });
  }

  private normalizeCart(cart: Cart): Cart {
    return {
      ...cart,
      items: (cart.items ?? []).map(item => {
        const rawVariant = item.product_variant as unknown;
        let variantObj = typeof rawVariant === 'object' && rawVariant !== null
          ? rawVariant as any
          : item.product_variant_detail;
          
        if (variantObj && variantObj.product) {
          variantObj = variantObj.product;
        }

        const variantId = variantObj ? Number(variantObj.id) : Number(item.product_variant);
        return {
          ...item,
          product_variant: variantId,
          product_variant_detail: variantObj,
          product_name: item.product_name ?? variantObj?.name ?? variantObj?.product_name ?? '',
          variant_name: item.variant_name ?? variantObj?.sku ?? '',
          price: item.price ?? variantObj?.final_price ?? variantObj?.price ?? '0.00',
          image: item.image ?? variantObj?.image?.image ?? variantObj?.product_images?.[0]?.image ?? variantObj?.images?.[0]?.image ?? '',
          weight: item.weight ?? variantObj?.weight ?? '',
          unit: item.unit ?? variantObj?.weight_unit ?? variantObj?.unit ?? '',
        };
      }),
      total_price: cart.total_price ?? '0.00',
      total_items: cart.total_items ?? (cart.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    };
  }
}
