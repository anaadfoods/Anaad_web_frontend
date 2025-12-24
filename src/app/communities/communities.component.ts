import { Component, OnInit, OnDestroy, ElementRef, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';
import { TiltOnHoverDirective } from '../shared/tilt-on-hover.directive';
import { ParallaxOnScrollDirective } from '../shared/parallax-on-scroll.directive';

@Component({
  selector: 'app-communities',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective, TiltOnHoverDirective, ParallaxOnScrollDirective],
  templateUrl: './communities.component.html',
  styleUrl: './communities.component.scss'
})
export class CommunitiesComponent implements OnInit, OnDestroy, AfterViewInit {
  private scrollListener!: () => void;

  constructor(private elementRef: ElementRef) { }

  ngOnInit() {
    this.setupScrollEffects();
  }

  ngAfterViewInit() {
    // Initial check for buttons in view
    setTimeout(() => {
      this.checkButtonVisibility();
    }, 500);
  }

  ngOnDestroy() {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  private setupScrollEffects() {
    this.scrollListener = this.throttle(() => {
      this.checkButtonVisibility();
      this.updateButtonEffects();
    }, 16); // ~60fps

    window.addEventListener('scroll', this.scrollListener);
  }

  private checkButtonVisibility() {
    const buttons = this.elementRef.nativeElement.querySelectorAll('.btn-register');

    buttons.forEach((button: HTMLElement, index: number) => {
      const rect = button.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 0.8 && rect.bottom > 0;

      if (isVisible && !button.classList.contains('scroll-revealed')) {
        // Stagger the animation based on button index
        setTimeout(() => {
          button.classList.add('scroll-revealed', 'shimmer');

          // Add floating animation
          setTimeout(() => {
            button.classList.add('floating');
          }, 1000);

          // Add scale animation for variety
          if (index % 2 === 0) {
            setTimeout(() => {
              button.classList.add('scroll-scale');
            }, 1500);
          }
        }, index * 200);
      }
    });
  }

  private updateButtonEffects() {
    const buttons = this.elementRef.nativeElement.querySelectorAll('.btn-register');
    const scrollY = window.scrollY;

    buttons.forEach((button: HTMLElement) => {
      const rect = button.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const distance = Math.abs(centerY - viewportCenter);

      // Dynamic effects based on scroll position
      if (distance < 200) {
        const intensity = 1 - (distance / 200);
        button.style.setProperty('--glow-intensity', intensity.toString());

        // Add magnetic field effect
        if (intensity > 0.7) {
          button.classList.add('magnetic-active');
        } else {
          button.classList.remove('magnetic-active');
        }
      }
    });
  }

  private throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function (this: any) {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  // Button interaction methods
  onButtonHover(event: Event) {
    const button = event.target as HTMLElement;
    button.classList.add('hover-active');

    // Create temporary glow particles
    this.createGlowParticles(button);
  }

  onButtonLeave(event: Event) {
    const button = event.target as HTMLElement;
    button.classList.remove('hover-active');
  }

  onButtonClick(event: Event) {
    const button = event.target as HTMLElement;

    // Add click ripple effect
    button.classList.add('clicked');
    setTimeout(() => button.classList.remove('clicked'), 600);

    // Add success feedback
    this.showClickFeedback(button);
  }

  private createGlowParticles(button: HTMLElement) {
    const rect = button.getBoundingClientRect();

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'glow-particle';
        particle.style.cssText = `
          position: fixed;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, rgba(199,153,33,0.8) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 1000;
          left: ${rect.left + Math.random() * rect.width}px;
          top: ${rect.top + Math.random() * rect.height}px;
          animation: floatAway 2s ease-out forwards;
        `;

        document.body.appendChild(particle);

        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, 2000);
      }, i * 100);
    }
  }

  private showClickFeedback(button: HTMLElement) {
    const feedback = document.createElement('span');
    feedback.textContent = '✨';
    feedback.className = 'click-feedback';
    feedback.style.cssText = `
      position: absolute;
      top: -10px;
      right: -10px;
      font-size: 20px;
      animation: feedbackPop 1s ease-out forwards;
      pointer-events: none;
      z-index: 10;
    `;

    button.style.position = 'relative';
    button.appendChild(feedback);

    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 1000);
  }
}