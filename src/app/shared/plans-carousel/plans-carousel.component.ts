import { Component, Input, OnInit, OnDestroy, PLATFORM_ID, inject, signal, Output, EventEmitter, AfterViewInit, ViewChildren, QueryList, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
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
export class PlansCarouselComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() plans: PlanCard[] = [];
  @Input() intervalMs = 4000; // 4 seconds per scroll (increased from 3)
  @Input() enableAutoHighlight = true;
  @Output() selectPlan = new EventEmitter<PlanCard>();

  @ViewChild('track', { static: true }) trackRef!: ElementRef<HTMLElement>;
  @ViewChildren('cardEl') cardRefs?: QueryList<ElementRef<HTMLElement>>;

  highlightedIndex = signal(-1); // -1 means no highlight
  private timer?: any;
  private platformId = inject(PLATFORM_ID);
  
  // For looping carousel
  clonedPlans: PlanCard[] = [];
  private currentIndex = 0;
  private scrollTimeout: any;

  ngOnInit(): void {
    if (this.plans.length > 0) {
      this.setupClones();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.resetPosition();
      if (this.enableAutoHighlight) {
        this.startHighlightLoop();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopHighlightLoop();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['plans'] && (this.plans?.length ?? 0) > 0) {
      this.setupClones();
      if (isPlatformBrowser(this.platformId)) {
        // Use timeout to allow view to update with new clones
        setTimeout(() => {
          this.resetPosition();
          if (this.enableAutoHighlight && !this.timer) {
            this.startHighlightLoop();
          }
        }, 0);
      }
    }
  }

  private setupClones() {
    if (this.plans.length > 0) {
      // Create enough clones for seamless infinite scroll
      // We need at least 3 clones on each side (for 3 visible cards)
      const numClones = Math.max(3, this.plans.length);
      this.clonedPlans = [
        ...this.plans.slice(-numClones), 
        ...this.plans, 
        ...this.plans.slice(0, numClones)
      ];
    }
  }

  private resetPosition() {
    if (!this.trackRef || this.plans.length === 0) return;
    const track = this.trackRef.nativeElement;
    const cardWidth = this.getCardWidth();
    // Start at the first "real" item, which is after the clones at the start.
    const numClones = Math.max(3, this.plans.length);
    this.currentIndex = numClones; 
    const initialOffset = this.currentIndex * cardWidth;
    track.style.transition = 'none';
    track.style.transform = `translateX(-${initialOffset}px)`;
    // Force reflow
    track.offsetHeight; 
    track.style.transition = 'transform 0.5s ease-in-out';
  }

  startHighlightLoop(): void {
    this.stopHighlightLoop();
    if (!isPlatformBrowser(this.platformId) || !this.enableAutoHighlight || this.plans.length === 0) return;
    
    this.timer = setInterval(() => {
      this.move(1);
    }, this.intervalMs);
  }

  stopHighlightLoop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private move(direction: number) {
    if (!this.trackRef) return;
    const track = this.trackRef.nativeElement;
    const cardWidth = this.getCardWidth();
    const numClones = Math.max(3, this.plans.length);
    
    this.currentIndex += direction;
    const offset = this.currentIndex * cardWidth;

    track.style.transform = `translateX(-${offset}px)`;

    // If we've scrolled to a cloned section, reset position after transition
    if (this.currentIndex >= this.plans.length + numClones) {
      this.scrollTimeout = setTimeout(() => {
        this.resetPosition();
      }, 500); // Match transition duration
    } else if (this.currentIndex < numClones) {
      this.scrollTimeout = setTimeout(() => {
        if (!this.trackRef) return;
        const newIndex = this.plans.length + this.currentIndex;
        const newOffset = newIndex * cardWidth;
        track.style.transition = 'none';
        track.style.transform = `translateX(-${newOffset}px)`;
        track.offsetHeight; // reflow
        track.style.transition = 'transform 0.5s ease-in-out';
        this.currentIndex = newIndex;
      }, 500);
    }
  }

  private getCardWidth(): number {
    if (this.cardRefs && this.cardRefs.first) {
      // Includes margin/gap
      const cardEl = this.cardRefs.first.nativeElement;
      const style = window.getComputedStyle(cardEl);
      const marginRight = parseInt(style.marginRight, 10) || 0;
      const marginLeft = parseInt(style.marginLeft, 10) || 0;
      return cardEl.offsetWidth + marginLeft + marginRight;
    }
    // Fallback, might not be perfect
    return 320 + 24; 
  }

  onCardHover(index: number): void {
    this.stopHighlightLoop();
    this.highlightedIndex.set(index % this.plans.length);
  }

  onCardLeave(): void {
    this.highlightedIndex.set(-1);
    if (this.enableAutoHighlight) {
      // Restart the loop after a short delay
      setTimeout(() => this.startHighlightLoop(), 1000);
    }
  }

  onSelect(plan: PlanCard) {
    this.selectPlan.emit(plan);
  }
}
