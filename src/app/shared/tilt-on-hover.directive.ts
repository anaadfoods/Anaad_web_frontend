import { Directive, ElementRef, NgZone, OnDestroy, OnInit, PLATFORM_ID, Renderer2, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Applies a subtle 3D tilt on hover using CSS variables:
 * --tilt-x, --tilt-y for rotation; --tilt-intensity controls max degrees.
 * Disables on touch devices and when prefers-reduced-motion is set (via CSS).
 */
@Directive({
  selector: '[tiltOnHover]',
  standalone: true,
})
export class TiltOnHoverDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private zone = inject(NgZone);
  private renderer = inject(Renderer2);
  private platformId = inject(PLATFORM_ID);

  private onMove?: (e: PointerEvent) => void;
  private onEnter?: () => void;
  private onLeave?: () => void;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const element = this.el.nativeElement;
    this.renderer.addClass(element, 'has-tilt');
    // Skip on coarse pointers (touch)
    const mql = window.matchMedia('(pointer:fine)');
    if (!mql.matches) return;

    this.zone.runOutsideAngular(() => {
      const rectCache = { w: 0, h: 0 };
      const updateTilt = (e: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        rectCache.w = rect.width; rectCache.h = rect.height;
        const x = (e.clientX - rect.left) / rect.width; // 0..1
        const y = (e.clientY - rect.top) / rect.height; // 0..1
        const rx = (0.5 - y) * 6; // max 6deg
        const ry = (x - 0.5) * 6;
        element.style.setProperty('--tilt-x', rx.toFixed(2));
        element.style.setProperty('--tilt-y', ry.toFixed(2));
      };

      this.onEnter = () => {
        element.style.setProperty('--tilt-x', '0');
        element.style.setProperty('--tilt-y', '0');
        element.style.willChange = 'transform';
      };
      this.onLeave = () => {
        element.style.setProperty('--tilt-x', '0');
        element.style.setProperty('--tilt-y', '0');
        element.style.willChange = '';
      };
      this.onMove = (e: PointerEvent) => updateTilt(e);

      element.addEventListener('pointerenter', this.onEnter!);
      element.addEventListener('pointermove', this.onMove!);
      element.addEventListener('pointerleave', this.onLeave!);
    });
  }

  ngOnDestroy(): void {
    const element = this.el.nativeElement;
    this.renderer.removeClass(element, 'has-tilt');
    if (this.onEnter) element.removeEventListener('pointerenter', this.onEnter);
    if (this.onMove) element.removeEventListener('pointermove', this.onMove as any);
    if (this.onLeave) element.removeEventListener('pointerleave', this.onLeave);
  }
}
