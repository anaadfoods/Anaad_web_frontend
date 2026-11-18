import { Component, Input, OnDestroy, OnInit, signal, ChangeDetectionStrategy, NgZone, inject } from '@angular/core';

export interface CarouselImage { src: string; alt: string; }

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-carousel',
  standalone: true,
  templateUrl: './image-carousel.component.html',
  styleUrls: ['./image-carousel.component.scss']
})
export class ImageCarouselComponent implements OnInit, OnDestroy {
  @Input() images: CarouselImage[] = [];
  @Input() intervalMs = 5000;
  @Input() height = 420; // px

  index = signal(0);
  private timer?: any;
  private readonly zone = inject(NgZone);

  ngOnInit(): void { this.start(); }
  ngOnDestroy(): void { this.stop(); }

  start() {
    this.stop();
    if (this.images.length <= 1) return;
    // Outside the Angular zone so this recurring timer doesn't block SSR
    // hydration (NG0506). index is a signal, so change detection still fires.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.next(), this.intervalMs);
    });
  }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = undefined; } }

  next() { this.index.update(i => (i + 1) % this.images.length); }
  prev() { this.index.update(i => (i - 1 + this.images.length) % this.images.length); }
  go(i: number) { this.index.set(i); this.start(); }
}
