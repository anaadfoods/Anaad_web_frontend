import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { SubscriptionService } from '../core/services/subscription.service';
import { ProductService } from '../core/services/product.service';
import { ProductsService, SiddhDiscountPrice } from '../core/services/products-public.service';
import { SubscriptionPlansComponent } from '../shared/components/subscription-plans/subscription-plans.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-commitment',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, SubscriptionPlansComponent],
  templateUrl: './commitment.html',
  styleUrls: ['./commitment.scss'],
})
export class Commitment implements OnInit {
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);
  private subscriptionSvc = inject(SubscriptionService);
  private router = inject(Router);
  private productService = inject(ProductService);
  private productsPublicSvc = inject(ProductsService);

  // Volatility Analyzer State
  siddhProducts = signal<SiddhDiscountPrice[]>([]);
  selectedVariantId = signal<number | null>(null);
  selectedQuantity = signal<number>(5);

  selectedProduct = computed(() => {
    return this.siddhProducts().find(p => p.variant_id === this.selectedVariantId()) || null;
  });

  unitWeight = computed(() => {
    const p = this.selectedProduct();
    if (!p) return 5;
    const w = parseFloat(p.weight);
    return isNaN(w) ? 5 : w;
  });

  maxQuantity = computed(() => this.unitWeight() * 10);

  ngOnInit() {
    this.titleSvc.setTitle('Commitment-Based Agriculture — Secure Your Harvest | ANAAD Foods');
    this.metaSvc.updateTag({
      name: 'description',
      content: 'Pre-fund a portion of our next sowing and receive your allocation before it reaches any market. Four tiers from ₹680/month. Named plot stewardship at the highest level. Cancel anytime.'
    });

    this.productsPublicSvc.getSiddhDiscountedPrices().subscribe({
      next: (products) => {
        this.siddhProducts.set(products);
        if (products.length > 0) {
          this.selectedVariantId.set(products[0].variant_id);
          const weight = parseFloat(products[0].weight) || 5;
          this.selectedQuantity.set(weight);
        }
      }
    });
  }

  onProductChange(event: any) {
    const variantId = Number(event.target.value);
    this.selectedVariantId.set(variantId);
    this.selectedQuantity.set(this.unitWeight());
  }

  onQuantityChange(event: any) {
    this.selectedQuantity.set(Number(event.target.value));
  }

  getMultiplier(): number {
    return Math.max(1, Math.round(this.selectedQuantity() / this.unitWeight()));
  }

  getSliderPercentage(): number {
    const min = this.unitWeight();
    const max = this.maxQuantity();
    const val = this.selectedQuantity();
    if (max <= min) return 0;
    return ((val - min) / (max - min)) * 100;
  }

  getAnaadPrice(): number {
    const p = this.selectedProduct();
    if (!p) return 0;
    return p.discounted_price * this.getMultiplier();
  }

  getConventionalPrice(): number {
    const p = this.selectedProduct();
    if (!p) return 0;
    return p.mrp * this.getMultiplier();
  }

  getDiscountPercentage(): number {
    const p = this.selectedProduct();
    if (!p) return 0;
    return p.discount_percentage;
  }

  subscribeToSiddh() {
    const variantId = this.selectedVariantId();
    if (!variantId) return;
    this.router.navigate(['/checkout'], {
      queryParams: {
        direct_buy: 'true',
        variant_id: variantId,
        qty: this.getMultiplier(),
        plan_id: 4
      }
    });
  }
}

