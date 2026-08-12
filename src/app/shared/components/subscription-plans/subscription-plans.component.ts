import { Component, OnInit, inject, signal, ChangeDetectionStrategy, Input, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, computed, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { PlansService, PlanCard } from '../../../core/services/plans.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ProductService } from '../../../core/services/product.service';
import { ProductVariant } from '../../../core/models/product.model';
import { CurrencyInrPipe } from '../../pipes/currency-inr.pipe';

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyInrPipe],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionPlansComponent implements OnInit {
  private plansSvc = inject(PlansService);
  private subscriptionSvc = inject(SubscriptionService);
  private productService = inject(ProductService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  @Input() showAction = false;
  @Input() actionLink = '/commitment';
  @Input() actionText = 'Choose Your Commitment Tier &rarr;';
  @Input() isCoverflow = false;

  @ViewChild('tierGrid') tierGrid!: ElementRef<HTMLDivElement>;

  subscriptionPlans = signal<PlanCard[]>([]);
  isMobile = signal<boolean>(false);

  extendedPlans = computed(() => {
    const plans = this.subscriptionPlans();
    if (!plans.length) return [];
    if (!this.isCoverflow || !this.isMobile()) return plans;

    let arr: PlanCard[] = [];
    for (let i = 0; i < 20; i++) arr = arr.concat(plans);
    return arr;
  });

  loadingPlans = signal<boolean>(true);
  plansError = signal<string>('');

  activeIndex = signal<number>(0);

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId) && this.isCoverflow && this.isMobile()) {
      setTimeout(() => {
        const centerIndex = Math.floor(this.extendedPlans().length / 2);
        this.activeIndex.set(centerIndex);
        this.scrollToIndex(centerIndex, 'auto');
      }, 300);
    }
  }

  onScroll() {
    if (!this.tierGrid?.nativeElement) return;
    const grid = this.tierGrid.nativeElement;
    const center = grid.scrollLeft + grid.clientWidth / 2;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    const children = grid.children;
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      // Filter out non-card elements if any, but we assume all children are cards
      if (!child.classList.contains('tier-card')) continue;
      
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(childCenter - center);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    if (this.activeIndex() !== closestIndex) {
      this.activeIndex.set(closestIndex);
    }
  }

  scrollToIndex(index: number, behavior: 'auto' | 'smooth' = 'smooth') {
    if (!this.tierGrid?.nativeElement) return;
    const grid = this.tierGrid.nativeElement;
    const children = Array.from(grid.children).filter(c => c.classList.contains('tier-card'));
    if (children[index]) {
      const child = children[index] as HTMLElement;
      const scrollPos = child.offsetLeft - grid.clientWidth / 2 + child.clientWidth / 2;
      grid.scrollTo({ left: scrollPos, behavior });
    }
  }

  scrollCarousel(direction: 'left' | 'right') {
    const nextIndex = direction === 'left' ? this.activeIndex() - 1 : this.activeIndex() + 1;
    this.scrollToIndex(nextIndex, 'smooth');
  }

  tierProducts = signal<Record<string, any[]>>({});
  tierSelectedVariant = signal<Record<string, number | null>>({});
  tierPricingData = signal<Record<string, { price: number, discount: number }>>({});
  allVariants = signal<ProductVariant[]>([]);

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  private checkMobile() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth <= 768);
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkMobile();
      this.productService.getVariants().pipe(take(1)).subscribe({
        next: (variants) => this.allVariants.set(variants)
      });

      this.plansSvc.getPlans().pipe(take(1)).subscribe({
        next: plans => {
          plans.sort((a, b) => Number(a.id) - Number(b.id));
          this.subscriptionPlans.set(plans);
          this.loadingPlans.set(false);

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
        }
      });
    } else {
      this.loadingPlans.set(true);
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

    this.router.navigate([`/product/${variantId}`], {
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
}
