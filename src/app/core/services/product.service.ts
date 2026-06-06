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
    const category: ProductCategory | undefined = variant.category ?? (variant.product_category
      ? { id: 0, name: variant.product_category }
      : undefined);
    const images = variant.images?.length ? variant.images : (variant.product_images ?? []);
    const finalPrice = variant.final_price ?? variant.price;
    return {
      ...variant,
      category,
      images,
      unit: variant.unit ?? variant.weight_unit ?? '',
      stock: variant.stock ?? (variant as any).stock_quantity ?? (variant.is_in_stock === false ? 0 : 10),
      price: finalPrice,
      compare_at_price: variant.compare_at_price ?? (variant.final_price ? variant.price : undefined),
      is_available: variant.is_available ?? variant.is_active ?? variant.is_in_stock ?? true,
    };
  }
}
