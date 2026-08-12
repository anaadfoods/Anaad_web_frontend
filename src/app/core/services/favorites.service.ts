// ============================================
// Favorites Service
// Manages favorite product variants
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { WishlistState } from '../state/wishlist.state';
import { ProductVariant } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly wishlistState = inject(WishlistState);

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

  /** Fetch all favorites for the authenticated user */
  getFavorites(): Observable<ProductVariant[]> {
    this.wishlistState.setLoading(true);
    return this.http.get<any>(API.AUTH.FAVORITES).pipe(
      map(res => {
        const rawItems = this.extractData(res);
        const items = Array.isArray(rawItems) ? rawItems : [];
        return items.map((item: any) => this.normalizeFavorite(item.product ?? item.product_variant ?? item));
      }),
      tap(variants => {
        const ids = variants.map(v => v.id);
        this.wishlistState.setFavorites(ids);
        this.wishlistState.setLoading(false);
      }),
      catchError(error => {
        this.wishlistState.setLoading(false);
        return throwError(() => error);
      })
    );
  }

  private normalizeFavorite(variant: any): ProductVariant {
    return {
      id: variant.id,
      sku: variant.sku,
      weight: variant.weight || '',
      weight_unit: variant.weight_unit || 'g',
      price: variant.price || '0.00',
      discount_percentage: variant.discount_percentage || '0',
      final_price: variant.final_price || variant.price || '0.00',
      is_in_stock: variant.is_in_stock ?? true,
      is_active: variant.is_active ?? true,
      tag: variant.tag ?? false,
      product_name: variant.name || variant.product_name || '',
      product_description: variant.product_description || '',
      product_category: variant.product_category || '',
      product_images: variant.product_images || [],
      stock: variant.stock ?? (variant.is_in_stock === false ? 0 : 10),
      is_available: variant.is_available ?? variant.is_active ?? variant.is_in_stock ?? true,
      images: variant.images?.length ? variant.images : (variant.image ? [variant.image] : (variant.product_images ?? [])),
    };
  }

  toggleFavorite(variantId: number): Observable<{ message?: string; isAdded?: boolean }> {
    const wasFavorite = this.wishlistState.isFavorite(variantId);
    this.wishlistState.toggle(variantId);

    return this.http.post<{ message?: string; isAdded?: boolean }>(
      `${API.AUTH.FAVORITES}${variantId}/toggle/`,
      {}
    ).pipe(
      tap(res => {
        if (typeof res?.isAdded === 'boolean' && res.isAdded === wasFavorite) {
          this.wishlistState.toggle(variantId);
        }
      }),
      catchError(error => {
        this.wishlistState.toggle(variantId);
        return throwError(() => error);
      })
    );
  }

  /** Sync favorites on login */
  syncOnLogin(): void {
    this.getFavorites().subscribe({
      error: () => this.wishlistState.setLoading(false),
    });
  }
}

interface FavoriteResponse {
  id: number;
  product_variant: ProductVariant;
}
