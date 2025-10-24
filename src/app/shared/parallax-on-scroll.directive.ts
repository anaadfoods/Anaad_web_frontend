import { Directive, ElementRef, Input, NgZone, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * ParallaxOnScrollDirective: sets CSS var --scroll-ty to a smooth translateY(px) value
 * relative to the element's position in the viewport. Default intensity = 12px.
 * Usage: <article parallaxOnScroll [intensity]="16">...</article>
 */
@Directive({
  selector: '[parallaxOnScroll], [parallax-on-scroll]',
  standalone: true,
})
export class ParallaxOnScrollDirective implements OnInit, OnDestroy {
  @Input() intensity = 12; // max px shift up/down
  // Alias input to satisfy strict template usage when using [parallaxOnScroll]
  @Input('parallaxOnScroll') set enabled(_val: any) { /* no-op toggler */ }

  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private removeScroll?: () => void;
  private rafId: number | null = null;
  private inView = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const element = this.el.nativeElement;
    element.classList.add('has-parallax');
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Intersection: only animate when in view
    this.io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        this.inView = entry.isIntersecting;
        if (!this.inView) this.setTy(0);
      }
    }, { threshold: [0, 1] });
    this.io.observe(element);

    // Recompute on resize
    this.ro = new ResizeObserver(() => this.schedule());
    this.ro.observe(document.documentElement);

    // Scroll listener
    this.zone.runOutsideAngular(() => {
      const onScroll = () => this.schedule();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.removeScroll = () => window.removeEventListener('scroll', onScroll);
    });

    // Initial compute
    this.schedule();
  }

  ngOnDestroy(): void {
    this.el.nativeElement.classList.remove('has-parallax');
    this.io?.disconnect();
    this.ro?.disconnect();
    if (this.removeScroll) this.removeScroll();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private schedule() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update();
    });
  }

  private update() {
    if (!this.inView) return;
    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // Compute a normalized progress: -1 at bottom edge, 0 at center, +1 at top edge
    const centerY = rect.top + rect.height / 2;
    const progress = (vh / 2 - centerY) / (vh / 2);
    const clamped = Math.max(-1, Math.min(1, progress));
    const ty = clamped * this.intensity;
    this.setTy(ty);
  }

  private setTy(val: number) {
    this.el.nativeElement.style.setProperty('--scroll-ty', `${val.toFixed(2)}px`);
  }
}
