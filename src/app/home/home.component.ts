import { take } from 'rxjs';
import { LogService } from '../core/services/log.service';
import { Component, OnInit, PLATFORM_ID, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { PlansService, PlanCard } from '../core/services/plans.service';
import { ProductsService, ProductCard } from '../core/services/products-public.service';
import { AuthState } from '../core/state/auth.state';
import { SubscriptionService } from '../core/services/subscription.service';
import { Subscription } from '../core/models/subscription.model';
import { ProductService } from '../core/services/product.service';
import { ProductVariant } from '../core/models/product.model';
import { CurrencyInrPipe } from '../shared/pipes/currency-inr.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective, CommonModule, CurrencyInrPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly logSvc = inject(LogService);
  private plansSvc = inject(PlansService);
  private productsSvc = inject(ProductsService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  readonly authState = inject(AuthState);
  private subscriptionSvc = inject(SubscriptionService);
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);
  private productService = inject(ProductService);
  
  activeSubscriptions = signal<Subscription[]>([]);
  
  subscriptionPlans = signal<PlanCard[]>([]);
  loadingPlans = signal<boolean>(true);
  plansError = signal<string>('');
  
  products = signal<ProductCard[]>([]);
  loadingProducts = signal<boolean>(true);
  productsError = signal<string>('');

  tierProducts = signal<Record<string, any[]>>({});
  tierSelectedVariant = signal<Record<string, number | null>>({});
  tierPricingData = signal<Record<string, { price: number, discount: number }>>({});
  allVariants = signal<ProductVariant[]>([]);

  getProductSubcopy(name: string): string {
    if (!name) return 'Heirloom Staple';
    const lower = name.toLowerCase();
    if (lower.includes('sona') || lower.includes('flour') || lower.includes('atta')) {
      return 'Sona Moti Atta · Batch AN-SON-0526 · Milled 3 days ago · From Sonipat, Haryana';
    } else if (lower.includes('chawal') || lower.includes('kathiya') || lower.includes('rice')) {
      return 'Chawal Kathiya Red Rice · Batch CK-2405-110 · Milled 5 days ago · From Sonipat, Haryana';
    } else if (lower.includes('millet') || lower.includes('sanwa')) {
      return 'Barnyard Millet (Sanwa) · Batch BM-2403-118 · Milled 4 days ago · From Sonipat, Haryana';
    }
    return `Heirloom Staple · Batch AN-SON-0526 · From Sonipat, Haryana`;
  }

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

      // Load subscription plans
      // Load all product variants
      this.productService.getVariants().pipe(take(1)).subscribe({
        next: (variants) => {
          this.allVariants.set(variants);
        }
      });

      // Load subscription plans
      this.plansSvc.getPlans().pipe(take(1)).subscribe({
        next: plans => {
          this.subscriptionPlans.set(plans);
          this.logSvc.debug('[Plans] Loaded', plans?.length ?? 0, 'items');
          this.loadingPlans.set(false);

          // Eagerly load products for each plan
          const productMap: Record<string, any[]> = {};
          const selectedMap: Record<string, number | null> = {};
          
          plans.forEach(plan => {
            productMap[plan.id] = [];
            selectedMap[plan.id] = null;
            
            this.subscriptionSvc.getPlanProducts(Number(plan.id)).subscribe({
              next: (res) => {
                const variants = res?.variants ?? [];
                const current = { ...this.tierProducts() };
                current[plan.id] = variants;
                this.tierProducts.set(current);

                // Automatically select first product if variants available
                if (variants.length > 0) {
                  const currentSelected = { ...this.tierSelectedVariant() };
                  currentSelected[plan.id] = variants[0].variant_id;
                  this.tierSelectedVariant.set(currentSelected);
                  this.fetchTierPrice(plan.id, variants[0].variant_id);
                }
              },
              error: () => {}
            });
          });
          
          this.tierProducts.set(productMap);
          this.tierSelectedVariant.set(selectedMap);
        },
        error: err => {
          this.plansError.set('Unable to load plans. Please try again later.');
          this.loadingPlans.set(false);
          this.logSvc.error('Plans load failed', err);
        }
      });

      // Load featured products
      this.productsSvc.getFirstFourProducts().pipe(take(1)).subscribe({
        next: products => {
          this.products.set(products);
          this.logSvc.debug('[Products] Loaded', products?.length ?? 0, 'items');
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
      this.loadingPlans.set(true);
      this.loadingProducts.set(true);
    }
  }

  onTierProductSelect(planId: string, event: any) {
    const val = event.target.value;
    const current = { ...this.tierSelectedVariant() };
    current[planId] = val ? Number(val) : null;
    this.tierSelectedVariant.set(current);
    if (val) this.fetchTierPrice(planId, Number(val));
  }

  fetchTierPrice(planId: string, variantId: number) {
    this.subscriptionSvc.getPlanPricesByVariant(variantId).subscribe({
      next: (prices) => {
        const planPriceObj = prices.find(p => p.plan_id.toString() === planId);
        if (planPriceObj) {
          const current = { ...this.tierPricingData() };
          current[planId] = { price: planPriceObj.discounted_price, discount: planPriceObj.discount_percentage };
          this.tierPricingData.set(current);
        }
      }
    });
  }

  goToProduct(planId: string) {
    const variantId = this.tierSelectedVariant()[planId];
    if (!variantId) return;

    this.router.navigate([`/products/${variantId}`], {
      queryParams: {
        subscribe: 'true',
        plan_id: Number(planId)
      }
    });
  }

  getDiscountedMonthlyPrice(planId: string): number {
    const data = this.tierPricingData()[planId];
    if (data) return data.price;

    const plan = this.subscriptionPlans().find(p => p.id === planId);
    const variantId = this.tierSelectedVariant()[planId];
    if (!plan || !variantId) return 0;
    
    const variant = this.allVariants().find(v => v.id === variantId);
    if (!variant) return 0;
    
    const basePrice = parseFloat(variant.price) || 0;
    const discount = plan.totalDiscountPercentage || 0;
    return Math.round(basePrice * (1 - discount / 100));
  }

  getOriginalPrice(planId: string): number {
    const variantId = this.tierSelectedVariant()[planId];
    if (!variantId) return 0;
    
    const variant = this.allVariants().find(v => v.id === variantId);
    if (!variant) return 0;
    
    return parseFloat(variant.price) || 0;
  }

  getSavingsPercentage(planId: string): number {
    const data = this.tierPricingData()[planId];
    if (data) return Math.round(data.discount);

    const plan = this.subscriptionPlans().find(p => p.id === planId);
    return plan ? Math.round(plan.totalDiscountPercentage ?? 0) : 0;
  }

  formatBg(url: string): string {
    // Wrap URL in quotes to support parentheses and special characters
    return `url("${url}")`;
  }
}
