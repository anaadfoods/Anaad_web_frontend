import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CartApiService } from '../../core/services/cart-api.service';
import { ProductVariant } from '../../core/models/product.model';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { SafeImageDirective } from '../../shared/safe-image.directive';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { QtySelectorComponent } from '../../shared/components/qty-selector/qty-selector.component';
import { AuthState } from '../../core/state/auth.state';
import { WishlistState } from '../../core/state/wishlist.state';
import { CartState } from '../../core/state/cart.state';
import { FavoritesService } from '../../core/services/favorites.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SubscriptionPlan } from '../../core/models/subscription.model';
import { ToastService } from '../../core/services/toast.service';
import { TruncatePipe } from '../../shared/pipes/truncate.pipe';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyInrPipe, SafeImageDirective, QtySelectorComponent, SkeletonLoaderComponent, TruncatePipe],
  templateUrl: './product-detail.html',
  styleUrls: ['./product-detail.scss'],
})
export class ProductDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productSvc = inject(ProductService);
  private readonly cartSvc = inject(CartApiService);
  private readonly authState = inject(AuthState);
  private readonly wishlistState = inject(WishlistState);
  private readonly cartState = inject(CartState);
  private readonly favoritesSvc = inject(FavoritesService);
  private readonly router = inject(Router);
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly toastSvc = inject(ToastService);

  variant = signal<ProductVariant | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');
  quantity = signal<number>(1);
  addingToCart = signal<boolean>(false);
  addedToCart = signal<boolean>(false);
  togglingFavorite = signal<boolean>(false);
  selectedImageIndex = signal<number>(0);

  subscriptionPlans = signal<SubscriptionPlan[]>([]);
  eligiblePlanIds = signal<number[]>([]);
  purchaseType = signal<'single' | 'subscription'>('single');
  selectedPlanId = signal<number | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadProduct(Number(id));
    });

    this.subscriptionSvc.getPlans().subscribe({
      next: (plans) => {
        const activePlans = plans.filter(p => p.is_active);
        this.subscriptionPlans.set(activePlans);
        // We will fetch eligible plans after the variant loads
      },
      error: () => console.error('Failed to load subscription plans')
    });
  }

  loadProduct(variantId: number) {
    this.loading.set(true);
    this.error.set('');
    this.productSvc.getVariant(variantId).subscribe({
      next: (v) => {
        this.variant.set(v);
        this.checkPlanEligibility(v.id);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Product not found or unavailable.');
        this.loading.set(false);
      }
    });
  }

  checkPlanEligibility(variantId: number) {
    const activePlans = this.subscriptionPlans();
    if (activePlans.length === 0) return;

    const requests = activePlans.map(plan => 
      this.subscriptionSvc.getPlanProducts(plan.id).pipe(catchError(() => of(null)))
    );

    forkJoin(requests).subscribe(responses => {
      const eligibleIds: number[] = [];
      responses.forEach((res, index) => {
        if (res && res.variants.some((v: any) => v.variant_id === variantId)) {
          eligibleIds.push(activePlans[index].id);
        }
      });
      this.eligiblePlanIds.set(eligibleIds);
      if (eligibleIds.length > 0) {
        const isSubscribeAction = this.route.snapshot.queryParamMap.get('subscribe') === 'true';
        if (isSubscribeAction) {
          this.purchaseType.set('subscription');
          this.selectedPlanId.set(eligibleIds[eligibleIds.length - 1]);
        } else {
          this.selectedPlanId.set(eligibleIds[0]);
        }
      } else {
        this.selectedPlanId.set(null);
        this.purchaseType.set('single');
      }
    });
  }

  onQuantityChange(qty: number) { this.quantity.set(qty); }

  selectImage(index: number) { this.selectedImageIndex.set(index); }

  get currentImage(): string {
    const v = this.variant();
    if (!v) return '';
    const images = v.images?.length ? v.images : (v.product_images ?? []);
    return images[this.selectedImageIndex()]?.image ?? images[0]?.image ?? '';
  }

  get allImages() {
    const v = this.variant();
    if (!v) return [];
    return v.images?.length ? v.images : (v.product_images ?? []);
  }

  hasStock(): boolean {
    const v = this.variant();
    if (!v) return false;
    const stockQty = v.stock ?? (v as any).stock_quantity;
    if (stockQty !== undefined) {
      return stockQty > 0;
    }
    return v.is_in_stock !== false;
  }

  addToCart() {
    const v = this.variant();
    if (!v || !this.hasStock()) return;
    if (!this.authState.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/products/${v.id}` } });
      return;
    }
    this.addingToCart.set(true);
    this.cartSvc.addItem(v.id, this.quantity()).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.addedToCart.set(true);
        this.toastSvc.show(`Added ${v.product_name} to cart!`, 'success');
        setTimeout(() => this.addedToCart.set(false), 2500);
      },
      error: () => {
        this.addingToCart.set(false);
        this.toastSvc.show('Failed to add item to cart.', 'error');
      }
    });
  }

  get cartQuantity(): number {
    const v = this.variant();
    return v ? this.cartState.getItemQuantity(v.id) : 0;
  }

  updateCartQuantity(qty: number) {
    const v = this.variant();
    if (!v) return;
    if (qty === 0) {
      this.cartSvc.removeItem(v.id).subscribe();
    } else {
      this.cartSvc.updateItem(v.id, qty).subscribe();
    }
  }

  buyNow() {
    const v = this.variant();
    if (!v || !this.hasStock()) return;
    if (!this.authState.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/products/${v.id}` } });
      return;
    }

    const queryParams: any = {
      direct_buy: 'true',
      variant_id: v.id,
      qty: this.quantity()
    };

    if (this.purchaseType() === 'subscription' && this.selectedPlanId()) {
      queryParams['plan_id'] = this.selectedPlanId();
    }

    this.router.navigate(['/checkout'], { queryParams });
  }

  get discountedSubscriptionPrice(): number {
    const v = this.variant();
    const planId = this.selectedPlanId();
    if (!v || !planId) return 0;
    
    const plan = this.subscriptionPlans().find(p => p.id === planId);
    const basePrice = parseFloat(v.price) || 0;
    
    if (plan && plan.discount_percentage) {
      const discount = parseFloat(plan.discount_percentage);
      return basePrice - (basePrice * (discount / 100));
    }
    return basePrice;
  }

  getPlanPrice(plan: SubscriptionPlan): number {
    const v = this.variant();
    if (!v) return 0;
    const basePrice = parseFloat(v.price) || 0;
    const discount = parseFloat(plan.discount_percentage) || 0;
    return basePrice - (basePrice * (discount / 100));
  }

  get savingsPercentage(): number {
    const v = this.variant();
    if (!v || !v.compare_at_price) return 0;
    const price = parseFloat(v.price) || 0;
    const comparePrice = parseFloat(v.compare_at_price) || 0;
    if (comparePrice <= 0 || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  }

  isFavorite(): boolean {
    const v = this.variant();
    return v ? this.wishlistState.isFavorite(v.id) : false;
  }

  toggleFavorite() {
    const v = this.variant();
    if (!v) return;
    if (!this.authState.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/products/${v.id}` } });
      return;
    }
    this.togglingFavorite.set(true);
    this.favoritesSvc.toggleFavorite(v.id).subscribe({
      next: () => this.togglingFavorite.set(false),
      error: () => this.togglingFavorite.set(false),
    });
  }
}
