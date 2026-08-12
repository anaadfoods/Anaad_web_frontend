import { take } from 'rxjs';
import { LogService } from '../core/services/log.service';
import { Component, OnInit, OnDestroy, PLATFORM_ID, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
export class HomeComponent implements OnInit, OnDestroy {
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
  private readonly cdr = inject(ChangeDetectorRef);

  activeSubscriptions = signal<Subscription[]>([]);

  products = signal<ProductVariant[]>([]);
  loadingProducts = signal<boolean>(true);
  productsError = signal<string>('');

  carouselImages = [
    { desktop: '/assets/image-desktop/1.png', mobile: '/assets/image-mobile/1.png' },
    { desktop: '/assets/image-desktop/2.png', mobile: '/assets/image-mobile/2.png' },
    { desktop: '/assets/image-desktop/3.png', mobile: '/assets/image-mobile/3.png' },
    { desktop: '/assets/image-desktop/4.png', mobile: '/assets/image-mobile/4.png' }
  ];
  activeIndex = 0;
  private autoplayInterval: any;

  // Swipe and Autoplay Pause states
  isHovered = false;
  isDragging = false;
  wasDragging = false;
  isPointerCaptured = false;
  startX = 0;
  dragOffset = 0;

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

      this.startAutoplay();
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

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  setActiveIndex(index: number): void {
    this.activeIndex = index;
    this.resetAutoplay();
    this.cdr.markForCheck();
  }

  prevSlide(): void {
    this.activeIndex = (this.activeIndex - 1 + this.carouselImages.length) % this.carouselImages.length;
    this.resetAutoplay();
    this.cdr.markForCheck();
  }

  nextSlide(): void {
    this.activeIndex = (this.activeIndex + 1) % this.carouselImages.length;
    this.resetAutoplay();
    this.cdr.markForCheck();
  }

  startAutoplay(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.stopAutoplay();
      // Hold/pause autoplay if user is hovering or dragging
      if (this.isHovered || this.isDragging) {
        return;
      }
      this.autoplayInterval = setInterval(() => {
        this.activeIndex = (this.activeIndex + 1) % this.carouselImages.length;
        this.cdr.markForCheck();
      }, 4000);
    }
  }

  stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }

  resetAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }

  onMouseEnter(): void {
    this.isHovered = true;
    this.stopAutoplay();
  }

  onMouseLeave(): void {
    this.isHovered = false;
    if (!this.isDragging) {
      this.startAutoplay();
    }
  }

  onPointerDown(event: PointerEvent): void {
    // Only drag with left click or touch/pen pointerType
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    this.isDragging = true;
    this.wasDragging = false;
    this.isPointerCaptured = false;
    this.startX = event.clientX;
    this.dragOffset = 0;
    this.stopAutoplay();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;

    const currentX = event.clientX;
    this.dragOffset = currentX - this.startX;

    if (Math.abs(this.dragOffset) > 5) {
      if (!this.wasDragging) {
        this.wasDragging = true;
        const container = event.currentTarget as HTMLElement;
        if (container && container.setPointerCapture) {
          container.setPointerCapture(event.pointerId);
          this.isPointerCaptured = true;
        }
      }
    }
    this.cdr.markForCheck();
  }

  onPointerEnd(event: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.isPointerCaptured) {
      const container = event.currentTarget as HTMLElement;
      if (container && container.releasePointerCapture) {
        container.releasePointerCapture(event.pointerId);
      }
      this.isPointerCaptured = false;
    }

    const threshold = 80; // Threshold of 80px to transition slides
    const oldOffset = this.dragOffset;
    this.dragOffset = 0;

    if (oldOffset < -threshold) {
      this.nextSlide();
    } else if (oldOffset > threshold) {
      this.prevSlide();
    } else {
      this.startAutoplay();
    }
    this.cdr.markForCheck();
  }

  onPointerLeave(event: PointerEvent): void {
    if (!this.isDragging) {
      this.startAutoplay();
    }
  }

  onSlideClick(event: MouseEvent): void {
    if (this.wasDragging) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
