import { Directive, ElementRef, PLATFORM_ID, inject, isDevMode, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[revealOnScroll]',
  standalone: true,
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  private renderer = inject(Renderer2);
  private platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const element = this.el.nativeElement;
    this.renderer.addClass(element, 'reveal');
    // Only run in the browser and when IntersectionObserver exists
    if (isPlatformBrowser(this.platformId) && typeof (globalThis as any).IntersectionObserver !== 'undefined') {
      this.zone.runOutsideAngular(() => {
        this.observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                this.renderer.addClass(element, 'is-visible');
                this.observer?.unobserve(element);
              }
            }
          },
          { threshold: 0.12 }
        );
        this.observer.observe(element);
      });
    } else {
      // SSR or missing API: reveal immediately to avoid hidden content on server
      this.renderer.addClass(element, 'is-visible');
      if (isDevMode()) {
        // no-op log for awareness during dev; will be tree-shaken in prod
        // console.debug('RevealOnScrollDirective: IntersectionObserver unavailable; revealed immediately');
      }
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
