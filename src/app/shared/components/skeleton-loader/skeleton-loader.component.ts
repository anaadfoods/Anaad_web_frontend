import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="skeleton-box" 
      [style.width]="width" 
      [style.height]="height" 
      [style.border-radius]="borderRadius"
      [class.circle]="circle">
    </div>
  `,
  styles: [`
    .skeleton-box {
      background-color: rgba(0, 0, 0, 0.05);
      position: relative;
      overflow: hidden;
    }
    
    .skeleton-box::after {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      transform: translateX(-100%);
      background-image: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0,
        rgba(255, 255, 255, 0.2) 20%,
        rgba(255, 255, 255, 0.5) 60%,
        rgba(255, 255, 255, 0)
      );
      animation: shimmer 2s infinite;
    }
    
    .circle {
      border-radius: 50% !important;
    }
    
    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() width = '100%';
  @Input() height = '100%';
  @Input() borderRadius = '4px';
  @Input() circle = false;
}
