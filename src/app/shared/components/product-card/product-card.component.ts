import { Component, EventEmitter, Input, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductVariant } from '../../../core/models/product.model';
import { CurrencyInrPipe } from '../../pipes/currency-inr.pipe';
import { TruncatePipe } from '../../pipes/truncate.pipe';
import { SafeImageDirective } from '../../safe-image.directive';
import { WishlistState } from '../../../core/state/wishlist.state';
import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthState } from '../../../core/state/auth.state';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyInrPipe, TruncatePipe, SafeImageDirective],
  template: `
    <div class="product-card">
      <a [routerLink]="['/products', variant.id]" class="product-image-wrap">
        <img
          [src]="variant.images[0]?.image || ''" appSafeImage
          [alt]="variant.product_name"
        />
        <!-- Optional Discount Badge -->
        <div class="badge-discount" *ngIf="hasDiscount()">
          -{{ discountPercent() }}%
        </div>
        
        <!-- Favorite Button -->
        <button type="button" class="btn-favorite" [class.active]="isFavorite()" (click)="toggleFavorite($event)" aria-label="Favorite">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                  [attr.fill]="isFavorite() ? 'var(--charcoal, #1A1A1A)' : 'none'" 
                  [attr.stroke]="isFavorite() ? 'var(--charcoal, #1A1A1A)' : 'currentColor'" 
                  stroke-width="2"/>
          </svg>
        </button>
      </a>
      
      <div class="product-body">
        <div class="product-tagline">{{ variant.category?.name || 'Heirloom Staple' }}</div>
        
        <a [routerLink]="['/products', variant.id]" class="product-title-link">
          <h3>{{ variant.product_name }}</h3>
        </a>
        
        <p class="product-desc">{{ variant.product_description | truncate: 120 }}</p>
        
        <div class="product-meta">
          <span class="product-format">{{ variant.weight }}{{ variant.unit }}</span>
          
          <div class="price-block">
            <span class="price-mrp" *ngIf="hasDiscount()">{{ variant.compare_at_price | currencyInr }}</span>
            <span class="product-price">{{ variant.price | currencyInr }}</span>
          </div>
        </div>
        
        <div class="product-actions">
          <button
            type="button"
            class="btn-product"
            (click)="onAddToCart()"
            [disabled]="!hasStock()">
            {{ hasStock() ? 'Add to Cart' : 'Out of Stock' }}
          </button>
          <button
            type="button"
            class="btn-product secondary"
            (click)="onSubscribeNow()"
            [disabled]="!hasStock()">
            Subscribe Now
          </button>
        </div>
        <button type="button" class="btn-save-row" [class.active]="isFavorite()" (click)="toggleFavorite($event)">
          {{ isFavorite() ? 'Saved to favorites' : 'Add to favorites' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .product-card {
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(26, 26, 26, 0.07);
      background-color: #fff;
      border-radius: 16px;
      overflow: hidden;
      transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
      height: 100%;
    }

    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(44, 74, 30, 0.08);
    }

    .product-image-wrap {
      position: relative;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      display: block;
      background: var(--bg-parchment, #F5F0E8);
    }

    .product-image-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s ease;
    }

    .product-card:hover .product-image-wrap img {
      transform: scale(1.05);
    }

    .badge-discount {
      position: absolute;
      top: 16px;
      left: 16px;
      background: var(--earth-raw, #6B4226);
      color: #fff;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 2px;
      letter-spacing: 0.05em;
    }

    .btn-favorite {
      position: absolute;
      top: 16px;
      right: 16px;
      background: #fff;
      border: 1px solid rgba(26, 26, 26, 0.1);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(26, 26, 26, 0.4);
      transition: all 0.2s ease;
      z-index: 10;
    }

    .btn-favorite:hover {
      transform: scale(1.1);
      color: var(--charcoal, #1A1A1A);
      border-color: rgba(26, 26, 26, 0.3);
    }
    
    .btn-favorite.active {
      color: var(--charcoal, #1A1A1A);
      border-color: var(--charcoal, #1A1A1A);
    }

    .product-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .product-tagline {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(26, 26, 26, 0.5);
      margin-bottom: 8px;
    }

    .product-title-link {
      text-decoration: none;
      color: inherit;
    }

    .product-body h3 {
      font-family: var(--font-serif, 'Cormorant Garamond', serif);
      font-size: 24px;
      font-weight: 600;
      color: var(--green-deep, #2C4A1E);
      margin-bottom: 12px;
      line-height: 1.2;
    }

    .product-desc {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 14px;
      color: rgba(26, 26, 26, 0.7);
      line-height: 1.5;
      margin-bottom: 24px;
      flex-grow: 1;
    }

    .product-meta {
      display: flex;
      flex-direction: row;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 24px;
      border-top: 1px solid rgba(26, 26, 26, 0.08);
      padding-top: 16px;
    }

    .product-format {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 13px;
      font-weight: 500;
      color: rgba(26, 26, 26, 0.6);
    }
    
    .price-block {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .price-mrp {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 12px;
      color: rgba(26, 26, 26, 0.4);
      text-decoration: line-through;
    }

    .product-price {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 18px;
      font-weight: 600;
      color: var(--charcoal, #1A1A1A);
    }

    .btn-product {
      display: block;
      width: 100%;
      padding: 14px 24px;
      background-color: transparent;
      border: 1px solid var(--green-deep, #2C4A1E);
      color: var(--green-deep, #2C4A1E);
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 13px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      text-align: center;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .product-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .btn-product.secondary {
      background-color: var(--green-deep, #2C4A1E);
      color: var(--bg-parchment, #F5F0E8);
    }

    .btn-product:hover:not(:disabled) {
      background-color: var(--green-deep, #2C4A1E);
      color: var(--bg-parchment, #F5F0E8);
    }

    .btn-product:disabled {
      border-color: rgba(26, 26, 26, 0.2);
      color: rgba(26, 26, 26, 0.4);
      cursor: not-allowed;
      background: rgba(26, 26, 26, 0.03);
    }

    .btn-save-row {
      margin-top: 10px;
      border: 0;
      background: transparent;
      color: rgba(26, 26, 26, 0.58);
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 12px;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .btn-save-row.active {
      color: var(--green-deep, #2C4A1E);
      font-weight: 600;
    }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) variant!: ProductVariant;
  
  @Output() addToCart = new EventEmitter<ProductVariant>();

  private readonly wishlistState = inject(WishlistState);
  private readonly favSvc = inject(FavoritesService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  isFavorite(): boolean {
    return this.wishlistState.isFavorite(this.variant?.id);
  }

  toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (this.variant) {
      if (!this.authState.isAuthenticated()) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/products' } });
        return;
      }
      this.favSvc.toggleFavorite(this.variant.id).subscribe();
    }
  }

  hasDiscount(): boolean {
    if (!this.variant) return false;
    const mrp = parseFloat(this.variant.compare_at_price || '0');
    const price = parseFloat(this.variant.price);
    return mrp > price;
  }

  discountPercent(): number {
    const mrp = parseFloat(this.variant.compare_at_price || '0');
    const price = parseFloat(this.variant.price);
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  hasStock(): boolean {
    if (!this.variant) return false;
    const stockQty = this.variant.stock ?? (this.variant as any).stock_quantity;
    if (stockQty !== undefined) {
      return stockQty > 0;
    }
    return this.variant.is_in_stock !== false;
  }

  onAddToCart() {
    if (this.hasStock()) {
      this.addToCart.emit(this.variant);
    }
  }

  onSubscribeNow() {
    if (this.hasStock()) {
      this.router.navigate(['/products', this.variant.id], { queryParams: { subscribe: 'true' } });
    }
  }
}
