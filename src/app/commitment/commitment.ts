import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { SubscriptionService } from '../core/services/subscription.service';

import { SubscriptionPlan } from '../core/models/subscription.model';
import { ProductService } from '../core/services/product.service';
import { ProductVariant } from '../core/models/product.model';
import { CurrencyInrPipe } from '../shared/pipes/currency-inr.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-commitment',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, CurrencyInrPipe],
  templateUrl: './commitment.html',
  styleUrls: ['./commitment.scss'],
})
export class Commitment implements OnInit {
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);
  private subscriptionSvc = inject(SubscriptionService);
  private router = inject(Router);
  private productService = inject(ProductService);

  // Plan & Tier State
  plans = signal<SubscriptionPlan[]>([]);
  tierPlans = signal<Record<string, SubscriptionPlan | null>>({});
  tierProducts = signal<Record<string, any[]>>({});
  tierSelectedVariant = signal<Record<string, number | null>>({});
  tierPricingData = signal<Record<string, { price: number, discount: number }>>({});
  allVariants = signal<ProductVariant[]>([]);

  // Volatility Analyzer State
  selectedVariety = 'sona_moti';
  selectedQuantity = 20; // in kg
  selectedMonths = 6; // crop season duration

  ngOnInit() {
    this.titleSvc.setTitle('Commitment-Based Agriculture — Secure Your Harvest | ANAAD Foods');
    this.metaSvc.updateTag({
      name: 'description',
      content: 'Pre-fund a portion of our next sowing and receive your allocation before it reaches any market. Four tiers from ₹680/month. Named plot stewardship at the highest level. Cancel anytime.'
    });

    // Load all product variants
    this.productService.getVariants().subscribe(variants => {
      this.allVariants.set(variants);
    });

    // Load active subscription plans and their eligible products
    this.subscriptionSvc.getPlans().subscribe({
      next: (plans) => {
        const activePlans = plans.filter(p => p.is_active);
        this.plans.set(activePlans);
        this.loadTierProducts(activePlans);
      },
      error: () => console.error('Failed to load subscription plans for commitment')
    });
  }

  onVarietyChange(event: any) {
    this.selectedVariety = event.target.value;
  }

  onQuantityChange(event: any) {
    this.selectedQuantity = Number(event.target.value);
  }

  onMonthsChange(event: any) {
    this.selectedMonths = Number(event.target.value);
  }

  getAnaadPrice(): number {
    let ratePerKg = 120;
    if (this.selectedQuantity <= 5) ratePerKg = 136;
    else if (this.selectedQuantity <= 10) ratePerKg = 126;
    else if (this.selectedQuantity <= 20) ratePerKg = 119;
    else ratePerKg = 105;

    // Adjust rate slightly based on variety
    if (this.selectedVariety === 'chawal_kathiya') ratePerKg += 10;
    if (this.selectedVariety === 'sharbati') ratePerKg -= 5;

    return ratePerKg * this.selectedQuantity * this.selectedMonths;
  }

  getConventionalPrice(): number {
    let baseRate = 90;
    if (this.selectedVariety === 'chawal_kathiya') baseRate = 105;
    if (this.selectedVariety === 'sharbati') baseRate = 85;

    // Middleman markups (35%) + Volatility (15% for season, 25% for full year)
    const markup = baseRate * 0.35;
    const volatility = baseRate * (this.selectedMonths === 12 ? 0.25 : this.selectedMonths >= 6 ? 0.15 : 0.05);
    
    return Math.round((baseRate + markup + volatility) * this.selectedQuantity * this.selectedMonths);
  }

  getSoilFunded(): number {
    // 1 kg represents about 1.5 sq yards of living soil cultivated
    return parseFloat((this.selectedQuantity * 1.5 * this.selectedMonths).toFixed(1));
  }

  getMiddlemenSavings(): number {
    return Math.max(0, this.getConventionalPrice() - this.getAnaadPrice());
  }

  /** Load eligible products for each tier card on initialization */
  private loadTierProducts(activePlans: SubscriptionPlan[]) {
    const tierNames = ['Aarambh', 'Pathik', 'Tapasvi', 'Siddh'];
    const planMap: Record<string, SubscriptionPlan | null> = {};
    const productMap: Record<string, any[]> = {};
    const selectedMap: Record<string, number | null> = {};

    tierNames.forEach(tierName => {
      const plan = this.findPlanForTier(tierName, activePlans);
      planMap[tierName] = plan;
      productMap[tierName] = [];
      selectedMap[tierName] = null;
    });

    this.tierPlans.set(planMap);
    this.tierProducts.set(productMap);
    this.tierSelectedVariant.set(selectedMap);

    // Fetch products for each matched plan
    tierNames.forEach(tierName => {
      const plan = planMap[tierName];
      if (plan) {
        this.subscriptionSvc.getPlanProducts(plan.id).subscribe({
          next: (res) => {
            const variants = res?.variants ?? [];
            const current = { ...this.tierProducts() };
            current[tierName] = variants;
            this.tierProducts.set(current);

            // Automatically select first product if variants available
            if (variants.length > 0) {
              const currentSelected = { ...this.tierSelectedVariant() };
              currentSelected[tierName] = variants[0].variant_id;
              this.tierSelectedVariant.set(currentSelected);
              if (plan) this.fetchTierPrice(tierName, plan.id, variants[0].variant_id);
            }
          },
          error: () => {}
        });
      }
    });
  }

  private findPlanForTier(tierName: string, plans: SubscriptionPlan[]): SubscriptionPlan | null {
    const matched = plans.find(p => p.name.toUpperCase().includes(tierName.toUpperCase()));
    if (matched) return matched;

    let duration = 12;
    if (tierName.toUpperCase() === 'AARAMBH') duration = 1;
    else if (tierName.toUpperCase() === 'PATHIK') duration = 3;
    else if (tierName.toUpperCase() === 'TAPASVI') duration = 6;

    return plans.find(p => p.duration_months === duration) || null;
  }

  onTierProductSelect(tierName: string, event: any) {
    const val = event.target.value;
    const current = { ...this.tierSelectedVariant() };
    current[tierName] = val ? Number(val) : null;
    this.tierSelectedVariant.set(current);
    const plan = this.tierPlans()[tierName];
    if (val && plan) this.fetchTierPrice(tierName, plan.id, Number(val));
  }

  fetchTierPrice(tierName: string, planId: number, variantId: number) {
    this.subscriptionSvc.getPlanPricesByVariant(variantId).subscribe({
      next: (prices) => {
        const planPriceObj = prices.find(p => p.plan_id === planId);
        if (planPriceObj) {
          const current = { ...this.tierPricingData() };
          current[tierName] = { price: planPriceObj.discounted_price, discount: planPriceObj.discount_percentage };
          this.tierPricingData.set(current);
        }
      }
    });
  }

  goToProduct(tierName: string) {
    const plan = this.tierPlans()[tierName];
    const variantId = this.tierSelectedVariant()[tierName];
    if (!plan || !variantId) return;

    this.router.navigate([`/products/${variantId}`], {
      queryParams: {
        subscribe: 'true',
        plan_id: plan.id
      }
    });
  }

  getDiscountedMonthlyPrice(tierName: string): number {
    const data = this.tierPricingData()[tierName];
    if (data) return data.price;

    const plan = this.tierPlans()[tierName];
    const variantId = this.tierSelectedVariant()[tierName];
    if (!plan || !variantId) return 0;
    
    const variant = this.allVariants().find(v => v.id === variantId);
    if (!variant) return 0;
    
    const basePrice = parseFloat(variant.price) || 0;
    const discount = plan.total_discount_percentage || 0;
    return Math.round(basePrice * (1 - discount / 100));
  }

  getOriginalPrice(tierName: string): number {
    const variantId = this.tierSelectedVariant()[tierName];
    if (!variantId) return 0;
    
    const variant = this.allVariants().find(v => v.id === variantId);
    if (!variant) return 0;
    
    return parseFloat(variant.price) || 0;
  }

  getSavingsPercentage(tierName: string): number {
    const data = this.tierPricingData()[tierName];
    if (data) return Math.round(data.discount);

    const plan = this.tierPlans()[tierName];
    return plan ? Math.round(plan.total_discount_percentage) : 0;
  }
}
