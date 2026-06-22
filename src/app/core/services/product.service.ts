import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { ProductCategory, ProductVariant } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  getVariants(): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(API.PRODUCTS.VARIANTS).pipe(
      map(variants => variants.map(v => this.normalizeVariant(v))),
      catchError(() => of([]))
    );
  }

  getFeatured(): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(API.PRODUCTS.FEATURED).pipe(
      map(variants => variants.map(v => this.normalizeVariant(v))),
      catchError(() => of([]))
    );
  }

  getBestsellers(): Observable<ProductVariant[]> {
    return this.http.get<ProductVariant[]>(API.PRODUCTS.BESTSELLERS).pipe(
      map(variants => variants.map(v => this.normalizeVariant(v))),
      catchError(() => of([]))
    );
  }

  getVariant(id: number): Observable<ProductVariant> {
    return this.http.get<ProductVariant>(`${API.PRODUCTS.VARIANTS}${id}/`).pipe(
      map(v => this.normalizeVariant(v))
    );
  }

  search(query: string): Observable<ProductVariant[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<ProductVariant[]>(API.PRODUCTS.SEARCH, { params }).pipe(
      map(variants => variants.map(v => this.normalizeVariant(v))),
      catchError(() => of([]))
    );
  }

  getByCategory(categoryName: string): Observable<ProductVariant[]> {
    const params = new HttpParams().set('category_name', categoryName);
    return this.http.get<ProductVariant[]>(API.PRODUCTS.VARIANTS, { params }).pipe(
      map(variants => variants.map(v => this.normalizeVariant(v))),
      catchError(() => of([]))
    );
  }

  private normalizeVariant(variant: ProductVariant): ProductVariant {
    let normalized = { ...variant };

    // Map categories properly based on revised category names
    let category: ProductCategory | undefined = normalized.category ?? (normalized.product_category
      ? { id: Number((normalized as any).product_category_id) || 0, name: normalized.product_category }
      : undefined);

    const images = normalized.images?.length ? normalized.images : (normalized.product_images ?? []);
    const finalPrice = normalized.final_price ?? normalized.price;

    return {
      ...normalized,
      category,
      images,
      unit: normalized.unit ?? normalized.weight_unit ?? '',
      stock: normalized.stock ?? (normalized as any).stock_quantity ?? (normalized.is_in_stock === false ? 0 : 10),
      price: finalPrice,
      compare_at_price: normalized.compare_at_price ?? (normalized.final_price ? normalized.price : undefined),
      is_available: normalized.is_available ?? normalized.is_active ?? normalized.is_in_stock ?? true,
    };
  }
}
