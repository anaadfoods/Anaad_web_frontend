import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { PlansService, PlanCard } from '../shared/services/plans.service';
import { ProductsService, ProductCard } from '../shared/services/products.service';
import { AuthState } from '../core/state/auth.state';
import { SubscriptionService } from '../core/services/subscription.service';
import { Subscription } from '../core/models/subscription.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private plansSvc = inject(PlansService);
  private productsSvc = inject(ProductsService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  readonly authState = inject(AuthState);
  private subscriptionSvc = inject(SubscriptionService);
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);
  
  activeSubscriptions = signal<Subscription[]>([]);
  
  subscriptionPlans: PlanCard[] = [];
  loadingPlans = true;
  plansError = '';
  
  products: ProductCard[] = [];
  loadingProducts = true;
  productsError = '';

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
        this.subscriptionSvc.getSubscriptions().subscribe({
          next: subs => {
            const active = subs.filter(s => s.status !== 'CANCELLED' && s.status !== 'EXPIRED');
            this.activeSubscriptions.set(active);
          }
        });
      }

      // Load subscription plans
      this.plansSvc.getPlans().subscribe({
        next: plans => {
          this.subscriptionPlans = plans;
          console.log('[Plans] Loaded', plans?.length ?? 0, 'items');
          this.loadingPlans = false;
        },
        error: err => {
          this.plansError = 'Unable to load plans. Please try again later.';
          this.loadingPlans = false;
          console.error('Plans load failed', err);
        }
      });

      // Load featured products
      this.productsSvc.getFirstFourProducts().subscribe({
        next: products => {
          this.products = products;
          console.log('[Products] Loaded', products?.length ?? 0, 'items');
          this.loadingProducts = false;
        },
        error: err => {
          this.productsError = 'Unable to load products. Please try again later.';
          this.loadingProducts = false;
          console.error('Products load failed', err);
        }
      });
    } else {
      // Avoid SSR network calls to external API; show loading until hydration, then client fetch will fill in
      this.loadingPlans = true;
      this.loadingProducts = true;
    }
  }

  onPlanSelected(plan: PlanCard) {
    // Navigate to register with selected plan id as a query param
    this.router.navigate(['/register'], { queryParams: { planId: plan.id } }).catch(() => {});
  }

  formatBg(url: string): string {
    // Wrap URL in quotes to support parentheses and special characters
    return `url("${url}")`;
  }
}
