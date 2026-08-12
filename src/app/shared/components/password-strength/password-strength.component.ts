import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="strength-meter" *ngIf="password">
      <div class="bars">
        <div class="bar" [class.filled]="score >= 1" [ngClass]="colorClass"></div>
        <div class="bar" [class.filled]="score >= 2" [ngClass]="colorClass"></div>
        <div class="bar" [class.filled]="score >= 3" [ngClass]="colorClass"></div>
        <div class="bar" [class.filled]="score >= 4" [ngClass]="colorClass"></div>
      </div>
      <div class="label" [ngClass]="colorClass">{{ label }}</div>
    </div>
  `,
  styles: [`
    .strength-meter {
      margin-top: 8px;
    }
    
    .bars {
      display: flex;
      gap: 4px;
      margin-bottom: 4px;
    }
    
    .bar {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      background-color: rgba(26, 26, 26, 0.1);
      transition: background-color 0.3s ease;
    }
    
    .bar.filled.weak { background-color: #ef4444; }
    .bar.filled.fair { background-color: #eab308; }
    .bar.filled.good { background-color: var(--green-deep, #2C4A1E); opacity: 0.7; }
    .bar.filled.strong { background-color: var(--green-deep, #2C4A1E); }
    
    .label {
      font-family: var(--font-sans, 'DM Sans', sans-serif);
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .label.weak { color: #ef4444; }
    .label.fair { color: #eab308; }
    .label.good { color: var(--green-deep, #2C4A1E); opacity: 0.8; }
    .label.strong { color: var(--green-deep, #2C4A1E); }
  `]
})
export class PasswordStrengthComponent implements OnChanges {
  @Input() password = '';
  
  score = 0;
  label = '';
  colorClass = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['password']) {
      this.calculateStrength();
    }
  }

  private calculateStrength(): void {
    if (!this.password) {
      this.score = 0;
      return;
    }

    let currentScore = 0;
    
    if (this.password.length >= 8) currentScore++;
    if (/[A-Z]/.test(this.password) && /[a-z]/.test(this.password)) currentScore++;
    if (/[0-9]/.test(this.password)) currentScore++;
    if (/[^A-Za-z0-9]/.test(this.password)) currentScore++;

    this.score = currentScore;
    
    switch (this.score) {
      case 1:
        this.label = 'Weak';
        this.colorClass = 'weak';
        break;
      case 2:
        this.label = 'Fair';
        this.colorClass = 'fair';
        break;
      case 3:
        this.label = 'Good';
        this.colorClass = 'good';
        break;
      case 4:
        this.label = 'Strong';
        this.colorClass = 'strong';
        break;
      default:
        this.label = 'Too short';
        this.colorClass = 'weak';
        this.score = 1;
    }
  }
}
