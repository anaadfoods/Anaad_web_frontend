// ============================================
// Category Service
// Fetches product categories
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { ProductCategory } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);

  /** Cached categories — rarely change, so share the result */
  private categories$: Observable<ProductCategory[]> | null = null;

  getCategories(): Observable<ProductCategory[]> {
    if (!this.categories$) {
      this.categories$ = this.http
        .get<ProductCategory[]>(API.PRODUCTS.CATEGORIES)
        .pipe(
          map(cats => {
            const mapped = cats.map(c => {
              if (c.name === 'cold pressed flour') {
                return { ...c, name: 'Wheat Flour' };
              }
              return c;
            }).filter(c => c.name !== 'Vegetables');

            // Inject Millets category dynamically
            mapped.push({
              id: 99,
              name: 'Millets',
              description: 'Heirloom millets',
              image: '',
              is_active: true,
              products_count: 1
            });

            return mapped;
          }),
          catchError(() => of([])),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }
    return this.categories$;
  }

  /** Force refresh */
  refreshCategories(): Observable<ProductCategory[]> {
    this.categories$ = null;
    return this.getCategories();
  }
}
