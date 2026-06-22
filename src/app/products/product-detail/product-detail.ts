import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  variant = signal<ProductVariant | null>(null);
  loading = signal<boolean>(true);
  error = signal<string>('');
  quantity = signal<number>(1);
  addingToCart = signal<boolean>(false);
  addedToCart = signal<boolean>(false);
  togglingFavorite = signal<boolean>(false);
  selectedImageIndex = signal<number>(0);

  subscriptionPlans = signal<SubscriptionPlan[]>([]);
  planPrices = signal<{plan_id: number, plan_name: string, discounted_price: number, discount_percentage: number}[]>([]);
  eligiblePlanIds = signal<number[]>([]);
  purchaseType = signal<'single' | 'subscription'>('single');
  showFullDescription = signal<boolean>(false);

  toggleDescription(event: Event) {
    event.preventDefault();
    this.showFullDescription.update(v => !v);
  }

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
        
        const currentVariant = this.variant();
        if (currentVariant) {
          this.checkPlanEligibility(currentVariant.id);
        }
      },
      error: () => console.error('Failed to load subscription plans')
    });
  }

  loadProduct(variantId: number) {
    this.loading.set(true);
    this.error.set('');
    this.productSvc.getVariant(variantId).subscribe({
      next: (v) => {
        this.selectedImageIndex.set(0);
        this.variant.set(v);
        
        // SEO Tags for SSR
        this.title.setTitle(`${v.product_name} - ANAAD Foods`);
        this.meta.updateTag({ name: 'description', content: v.product_description || 'Heirloom grain, traced from living soil.' });
        const ogImage = v.images?.length ? v.images[0].image : (v.product_images?.length ? v.product_images[0].image : '');
        if (ogImage) {
          this.meta.updateTag({ property: 'og:image', content: ogImage });
        }

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
    this.subscriptionSvc.getPlanPricesByVariant(variantId).subscribe({
      next: (prices) => {
        this.planPrices.set(prices);
        const eligibleIds = prices.map(p => p.plan_id);
        this.eligiblePlanIds.set(eligibleIds);

        if (eligibleIds.length > 0) {
          const isSubscribeAction = this.route.snapshot.queryParamMap.get('subscribe') === 'true';
          const queryPlanId = this.route.snapshot.queryParamMap.get('plan_id');
          const parsedPlanId = queryPlanId ? Number(queryPlanId) : null;
          const queryQty = this.route.snapshot.queryParamMap.get('qty');
          if (queryQty) {
            this.quantity.set(Number(queryQty));
          }

          if (parsedPlanId && eligibleIds.includes(parsedPlanId)) {
            this.purchaseType.set('subscription');
            this.selectedPlanId.set(parsedPlanId);
          } else if (isSubscribeAction) {
            this.purchaseType.set('subscription');
            this.selectedPlanId.set(eligibleIds[eligibleIds.length - 1]);
          } else {
            this.selectedPlanId.set(eligibleIds[0]);
          }
        } else {
          this.selectedPlanId.set(null);
          this.purchaseType.set('single');
        }
      },
      error: () => {
        this.planPrices.set([]);
        this.eligiblePlanIds.set([]);
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

  isActive(): boolean {
    const v = this.variant();
    if (!v) return false;
    return v.is_active !== false;
  }

  get maxAllowedQuantity(): number {
    const v = this.variant();
    if (!v) return 5;
    const stock = v.stock ?? (v as any).stock_quantity ?? 5;
    return Math.min(5, stock);
  }

  addToCart() {
    const v = this.variant();
    if (!v || !this.hasStock()) return;
    if (!this.authState.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/products/${v.id}` } });
      return;
    }
    this.addingToCart.set(true);
    this.cartSvc.addItem(v.id, this.quantity(), v).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.addedToCart.set(true);
        this.toastSvc.show(`Added ${v.product_name} to cart!`, 'success');
        setTimeout(() => this.addedToCart.set(false), 2500);
      },
      error: (err) => {
        this.addingToCart.set(false);
        if (err.message !== 'Limit reached') {
          this.toastSvc.show('Failed to add item to cart.', 'error');
        }
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
      const returnUrl = this.purchaseType() === 'subscription' && this.selectedPlanId()
        ? `/products/${v.id}?subscribe=true&plan_id=${this.selectedPlanId()}`
        : `/products/${v.id}`;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    const finalQty = (this.purchaseType() === 'single' && this.cartQuantity > 0)
      ? this.cartQuantity
      : this.quantity();

    const queryParams: any = {
      direct_buy: 'true',
      variant_id: v.id,
      qty: finalQty
    };

    if (this.purchaseType() === 'subscription' && this.selectedPlanId()) {
      queryParams['plan_id'] = this.selectedPlanId();
    }

    this.router.navigate(['/checkout'], { queryParams });
  }

  get discountedSubscriptionPrice(): number {
    const planId = this.selectedPlanId();
    if (!planId) return 0;
    
    const planPriceObj = this.planPrices().find(p => p.plan_id === planId);
    if (planPriceObj) return planPriceObj.discounted_price;
    
    // Fallback if not found in API response
    const v = this.variant();
    const plan = this.subscriptionPlans().find(p => p.id === planId);
    const basePrice = v ? (parseFloat(v.price) || 0) : 0;
    
    if (plan && plan.discount_percentage) {
      const discount = parseFloat(plan.discount_percentage);
      return basePrice - (basePrice * (discount / 100));
    }
    return basePrice;
  }

  getPlanPrice(plan: SubscriptionPlan): number {
    const planPriceObj = this.planPrices().find(p => p.plan_id === plan.id);
    if (planPriceObj) return planPriceObj.discounted_price;

    // Fallback if not found in API response
    const v = this.variant();
    const basePrice = v ? (parseFloat(v.price) || 0) : 0;
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
      const returnUrl = this.purchaseType() === 'subscription' && this.selectedPlanId()
        ? `/products/${v.id}?subscribe=true&plan_id=${this.selectedPlanId()}`
        : `/products/${v.id}`;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }
    this.togglingFavorite.set(true);
    this.favoritesSvc.toggleFavorite(v.id).subscribe({
      next: () => this.togglingFavorite.set(false),
      error: () => this.togglingFavorite.set(false),
    });
  }
}
