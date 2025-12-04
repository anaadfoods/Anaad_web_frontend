 import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { PlansCarouselComponent } from '../shared/plans-carousel/plans-carousel.component';
import { TiltOnHoverDirective } from '../shared/tilt-on-hover.directive';
import { ParallaxOnScrollDirective } from '../shared/parallax-on-scroll.directive';
import { PlansService, PlanCard } from '../shared/services/plans.service';
import { ProductsService, ProductCard } from '../shared/services/products.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective, PlansCarouselComponent, TiltOnHoverDirective, ParallaxOnScrollDirective],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private plansSvc = inject(PlansService);
  private productsSvc = inject(ProductsService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  subscriptionPlans: PlanCard[] = [];
  loadingPlans = true;
  plansError = '';
  
  products: ProductCard[] = [];
  loadingProducts = true;
  productsError = '';

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
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
