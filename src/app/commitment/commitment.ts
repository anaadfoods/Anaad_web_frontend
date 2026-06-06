import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { RevealOnScrollDirective } from '../shared/reveal-on-scroll.directive';

@Component({
  selector: 'app-commitment',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealOnScrollDirective],
  templateUrl: './commitment.html',
  styleUrls: ['./commitment.scss'],
})
export class Commitment implements OnInit {
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);

  // Volatility Analyzer State
  selectedVariety = 'sona_moti';
  selectedQuantity = 20; // in kg
  selectedMonths = 6; // crop season duration

  ngOnInit() {
    this.titleSvc.setTitle('Commitment-Based Agriculture — Secure Your Harvest | ANAAD Foods');
    this.metaSvc.updateTag({
      name: 'description',
      content: 'Pre-fund a portion of our next sowing and receive your allocation before it reaches any market. Four tiers from ₹680/month. Named plot stewardship at the highest level. Cancel anytime.'
    });
  }

  onVarietyChange(event: any) {
    this.selectedVariety = event.target.value;
  }

  onQuantityChange(event: any) {
    this.selectedQuantity = Number(event.target.value);
  }

  onMonthsChange(event: any) {
    this.selectedMonths = Number(event.target.value);
  }

  getAnaadPrice(): number {
    let ratePerKg = 120;
    if (this.selectedQuantity <= 5) ratePerKg = 136;
    else if (this.selectedQuantity <= 10) ratePerKg = 126;
    else if (this.selectedQuantity <= 20) ratePerKg = 119;
    else ratePerKg = 105;

    // Adjust rate slightly based on variety
    if (this.selectedVariety === 'chawal_kathiya') ratePerKg += 10;
    if (this.selectedVariety === 'sharbati') ratePerKg -= 5;

    return ratePerKg * this.selectedQuantity * this.selectedMonths;
  }

  getConventionalPrice(): number {
    let baseRate = 90;
    if (this.selectedVariety === 'chawal_kathiya') baseRate = 105;
    if (this.selectedVariety === 'sharbati') baseRate = 85;

    // Middleman markups (35%) + Volatility (15% for season, 25% for full year)
    const markup = baseRate * 0.35;
    const volatility = baseRate * (this.selectedMonths === 12 ? 0.25 : this.selectedMonths >= 6 ? 0.15 : 0.05);
    
    return Math.round((baseRate + markup + volatility) * this.selectedQuantity * this.selectedMonths);
  }

  getSoilFunded(): number {
    // 1 kg represents about 1.5 sq yards of living soil cultivated
    return parseFloat((this.selectedQuantity * 1.5 * this.selectedMonths).toFixed(1));
  }

  getMiddlemenSavings(): number {
    return Math.max(0, this.getConventionalPrice() - this.getAnaadPrice());
  }
}
