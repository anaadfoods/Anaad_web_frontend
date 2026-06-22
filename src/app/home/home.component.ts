import { take } from 'rxjs';
import { LogService } from '../core/services/log.service';
import { Component, OnInit, PLATFORM_ID, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { PlansService, PlanCard } from '../core/services/plans.service';
import { AuthState } from '../core/state/auth.state';
import { SubscriptionService } from '../core/services/subscription.service';
import { Subscription } from '../core/models/subscription.model';
import { ProductService } from '../core/services/product.service';
import { ProductVariant } from '../core/models/product.model';
import { SubscriptionPlansComponent } from '../shared/components/subscription-plans/subscription-plans.component';
import { ProductCardComponent } from '../shared/components/product-card/product-card.component';
import { CartApiService } from '../core/services/cart-api.service';
import { ToastService } from '../core/services/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective, CommonModule, SubscriptionPlansComponent, ProductCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly logSvc = inject(LogService);
  private plansSvc = inject(PlansService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  readonly authState = inject(AuthState);
  private subscriptionSvc = inject(SubscriptionService);
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);
  private productService = inject(ProductService);
  private readonly cartSvc = inject(CartApiService);
  private readonly toastSvc = inject(ToastService);
  
  activeSubscriptions = signal<Subscription[]>([]);
  
  products = signal<ProductVariant[]>([]);
  loadingProducts = signal<boolean>(true);
  productsError = signal<string>('');



  ngOnInit(): void {
    this.titleSvc.setTitle('ANAAD Foods — Heirloom Grain, Traced from Living Soil | Sonipat, Haryana');
    this.metaSvc.updateTag({ name: 'description', content: 'ANAAD grows indigenous heirloom wheat and rice on 28 acres of ICBN-certified farmland in Sonipat. Every batch is independently tested by SGS India and traced to the field. No chemicals. No warehouse. Pan-India delivery within 72 hours of milling.' });
    
    if (isPlatformBrowser(this.platformId)) {
      
      if (this.authState.isAuthenticated()) {
        this.subscriptionSvc.getSubscriptions().pipe(take(1)).subscribe({
          next: subs => {
            const active = subs.filter(s => s.status !== 'CANCELLED' && s.status !== 'EXPIRED');
            this.activeSubscriptions.set(active);
          }
        });
      }

      // Load featured products
      this.productService.getVariants().pipe(take(1)).subscribe({
        next: products => {
          this.products.set(products.slice(0, 4));
          this.logSvc.debug('[Products] Loaded', products?.slice(0, 4)?.length ?? 0, 'items');
          this.loadingProducts.set(false);
        },
        error: err => {
          this.productsError.set('Unable to load products. Please try again later.');
          this.loadingProducts.set(false);
          this.logSvc.error('Products load failed', err);
        }
      });
    } else {
      // Avoid SSR network calls to external API; show loading until hydration, then client fetch will fill in
      this.loadingProducts.set(true);
    }
  }



  onAddToCart(variant: ProductVariant) {
    if (!this.authState.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      return;
    }
    this.cartSvc.addItem(variant.id, 1, variant).subscribe({
      next: () => {
        this.toastSvc.show(`Added ${variant.product_name} to cart!`, 'success');
      },
      error: (err) => {
        if (err.message !== 'Limit reached') {
          this.toastSvc.show(`Failed to add ${variant.product_name} to cart.`, 'error');
        }
      },
    });
  }

  formatBg(url: string): string {
    // Wrap URL in quotes to support parentheses and special characters
    return `url("${url}")`;
  }
}
