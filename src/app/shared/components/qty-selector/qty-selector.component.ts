import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-qty-selector',
  standalone: true,
  template: `
    <div class="qty-control" [class.disabled]="disabled">
      <button 
        type="button" 
        class="qty-btn" 
        (click)="decrement()" 
        [disabled]="disabled || value <= min"
        aria-label="Decrease quantity">
        <svg width="12" height="2" viewBox="0 0 12 2" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      
      <span class="qty-val">{{ value }}</span>
      
      <button 
        type="button" 
        class="qty-btn" 
        (click)="increment()" 
        [disabled]="disabled || value >= max"
        aria-label="Increase quantity">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .qty-control {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid rgba(26, 26, 26, 0.15);
      border-radius: 4px;
      height: 40px;
      width: 110px;
      padding: 0 4px;
      background: var(--bg-parchment, #F5F0E8);
    }
    
    .qty-control.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    
    .qty-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--charcoal, #1A1A1A);
      cursor: pointer;
      transition: color 0.2s ease, opacity 0.2s ease;
    }
    
    .qty-btn:hover:not(:disabled) {
      color: var(--green-deep, #2C4A1E);
    }
    
    .qty-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .qty-val {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 14px;
      font-weight: 500;
      color: var(--charcoal, #1A1A1A);
      min-width: 24px;
      text-align: center;
    }
  `]
})
export class QtySelectorComponent {
  @Input() value = 1;
  @Input() min = 1;
  @Input() max = 99;
  @Input() disabled = false;
  
  @Output() valueChange = new EventEmitter<number>();

  increment() {
    if (this.value < this.max) {
      this.value++;
      this.valueChange.emit(this.value);
    }
  }

  decrement() {
    if (this.value > this.min) {
      this.value--;
      this.valueChange.emit(this.value);
    }
  }
}
