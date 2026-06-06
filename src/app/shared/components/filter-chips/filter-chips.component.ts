import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-filter-chips',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="filter-chips">
      @for (opt of options; track opt.value) {
      <button 
        type="button"
        class="chip"
        [class.active]="opt.value === selectedValue"
        (click)="select(opt.value)">
        {{ opt.label }}
      </button>
      }
    </div>
  `,
  styles: [`
    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .chip {
      padding: 8px 16px;
      border-radius: 100px;
      border: 1px solid rgba(26, 26, 26, 0.15);
      background: transparent;
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 13px;
      font-weight: 500;
      color: var(--charcoal, #1A1A1A);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .chip:hover {
      border-color: rgba(26, 26, 26, 0.3);
      background: rgba(26, 26, 26, 0.03);
    }
    
    .chip.active {
      background: var(--charcoal, #1A1A1A);
      color: var(--bg-parchment, #F5F0E8);
      border-color: var(--charcoal, #1A1A1A);
    }
  `]
})
export class FilterChipsComponent {
  @Input() options: FilterOption[] = [];
  @Input() selectedValue: string = '';
  
  @Output() selectionChange = new EventEmitter<string>();

  select(value: string) {
    this.selectedValue = value;
    this.selectionChange.emit(value);
  }
}
