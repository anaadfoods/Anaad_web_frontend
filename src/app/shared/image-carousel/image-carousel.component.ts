import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';

export interface CarouselImage { src: string; alt: string; }

@Component({
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

  ngOnInit(): void { this.start(); }
  ngOnDestroy(): void { this.stop(); }

  start() {
    this.stop();
    if (this.images.length <= 1) return;
    this.timer = setInterval(() => this.next(), this.intervalMs);
  }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = undefined; } }

  next() { this.index.update(i => (i + 1) % this.images.length); }
  prev() { this.index.update(i => (i - 1 + this.images.length) % this.images.length); }
  go(i: number) { this.index.set(i); this.start(); }
}
