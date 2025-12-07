import { Component, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, Inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  isOpen = signal(false);
  
  // 3D Tilt effect
  tiltX = signal(0);
  tiltY = signal(0);
  glareX = signal(50);
  glareY = signal(50);
  isHovering = signal(false);
  
  // Seasonal theme
  currentSeason = signal<Season>(this.detectSeason());
  
  // Computed seasonal class
  seasonClass = computed(() => `season-${this.currentSeason()}`);
  
  @ViewChild('logoContainer') logoContainer!: ElementRef<HTMLElement>;
  
  private isBrowser: boolean;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseLeave: (() => void) | null = null;
  private boundMouseEnter: (() => void) | null = null;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private detectSeason(): Season {
    const month = new Date().getMonth(); // 0-11
    // Northern hemisphere seasons
    if (month >= 2 && month <= 4) return 'spring';      // Mar-May
    if (month >= 5 && month <= 7) return 'summer';      // Jun-Aug
    if (month >= 8 && month <= 10) return 'autumn';     // Sep-Nov
    return 'winter';                                     // Dec-Feb
  }

  ngAfterViewInit() {
    if (this.isBrowser && this.logoContainer) {
      this.boundMouseMove = this.onMouseMove.bind(this);
      this.boundMouseLeave = this.onMouseLeave.bind(this);
      this.boundMouseEnter = this.onMouseEnter.bind(this);
      
      this.logoContainer.nativeElement.addEventListener('mousemove', this.boundMouseMove);
      this.logoContainer.nativeElement.addEventListener('mouseleave', this.boundMouseLeave);
      this.logoContainer.nativeElement.addEventListener('mouseenter', this.boundMouseEnter);
    }
  }

  ngOnDestroy() {
    if (this.isBrowser && this.logoContainer) {
      if (this.boundMouseMove) {
        this.logoContainer.nativeElement.removeEventListener('mousemove', this.boundMouseMove);
      }
      if (this.boundMouseLeave) {
        this.logoContainer.nativeElement.removeEventListener('mouseleave', this.boundMouseLeave);
      }
      if (this.boundMouseEnter) {
        this.logoContainer.nativeElement.removeEventListener('mouseenter', this.boundMouseEnter);
      }
    }
  }

  private onMouseMove(e: MouseEvent) {
    const el = this.logoContainer.nativeElement;
    const rect = el.getBoundingClientRect();
    
    // Calculate position relative to element center (-1 to 1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    const centerX = x - 0.5;
    const centerY = y - 0.5;
    
    // Tilt amount (degrees) - inverted for natural feel
    const maxTilt = 25;
    this.tiltX.set(-centerY * maxTilt);
    this.tiltY.set(centerX * maxTilt);
    
    // Glare position (percentage)
    this.glareX.set(x * 100);
    this.glareY.set(y * 100);
  }

  private onMouseEnter() {
    this.isHovering.set(true);
  }

  private onMouseLeave() {
    this.isHovering.set(false);
    // Smoothly reset tilt
    this.tiltX.set(0);
    this.tiltY.set(0);
    this.glareX.set(50);
    this.glareY.set(50);
  }

  toggle() { this.isOpen.update(v => !v); }
  close() { this.isOpen.set(false); }
}
