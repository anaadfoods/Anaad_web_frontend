import { Component, Input, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface PlanCard {
  id: string;
  title: string;
  description: string;
  durationLabel: string; // e.g., '3 Months'
  allowsInstallments: string; // 'Yes' | 'No'
  allowanceLabel: string; // e.g., '3 Months'
  savingsLabel: string; // e.g., '23% Discount'
}

@Component({
  selector: 'app-plans-carousel',
  standalone: true,
  imports: [],
  templateUrl: './plans-carousel.component.html',
  styleUrls: ['./plans-carousel.component.scss']
})
export class PlansCarouselComponent implements OnInit, OnDestroy {
  @Input() plans: PlanCard[] = [];
  @Input() intervalMs = 5000;
  index = signal(0);
  private timer?: any;
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.start();
    }
  }
  ngOnDestroy(): void { this.stop(); }

  start() {
    this.stop();
    if (this.plans.length > 1) this.timer = setInterval(() => this.next(), this.intervalMs);
  }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = undefined; } }
  next() { if (!this.plans.length) return; this.index.update(i => (i + 1) % this.plans.length); }
  prev() { if (!this.plans.length) return; this.index.update(i => (i - 1 + this.plans.length) % this.plans.length); }
  go(i: number) { if (!this.plans.length) return; this.index.set(i); this.start(); }

  get leftIndex(): number { return this.plans.length ? (this.index() - 1 + this.plans.length) % this.plans.length : 0; }
  get rightIndex(): number { return this.plans.length ? (this.index() + 1) % this.plans.length : 0; }
}
