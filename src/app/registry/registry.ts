import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { SubscriptionService } from '../core/services/subscription.service';
import { SubscriptionPlan } from '../core/models/subscription.model';
import { AuthState } from '../core/state/auth.state';

@Component({
  selector: 'app-registry',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './registry.html',
  styleUrls: ['./registry.scss'],
})
export class Registry implements OnInit {
  private readonly subscriptionSvc = inject(SubscriptionService);
  readonly authState = inject(AuthState);
  private titleSvc = inject(Title);
  private metaSvc = inject(Meta);

  plans = signal<SubscriptionPlan[]>([]);
  loading = signal(true);
  error = signal('');

  // Static batch registry data (not from API)
  filter = 'All';
  batches = [
    { id: 'SM-2406-382', date: '12 Jun 2024', variety: 'Sona Moti Whole Wheat', result: 'Zero Residue', pass: true },
    { id: 'CK-2405-110', date: '28 May 2024', variety: 'Chawal Kathiya Red Rice', result: 'Zero Residue', pass: true },
    { id: 'BS-2404-092', date: '14 Apr 2024', variety: 'Black Sesame Seeds', result: 'Zero Residue', pass: true },
    { id: 'BM-2403-118', date: '02 Mar 2024', variety: 'Bansi Wheat', result: 'Zero Residue', pass: true },
    { id: 'SM-2311-304', date: '18 Nov 2023', variety: 'Sona Moti Whole Wheat', result: 'Zero Residue', pass: true },
  ];

  getPlanCustomName(months: number): string {
    if (months === 1) return 'AARAMBH (The Beginning)';
    if (months === 3) return 'PATHIK (The Seeker)';
    if (months === 6) return 'TAPASVI (The Disciplined)';
    if (months === 12) return 'SIDDH (The Master)';
    return 'ANAAD Commitment';
  }

  getPlanCustomHeadline(months: number): string {
    if (months === 1) return 'Start here. No obligation. Full transparency.';
    if (months === 3) return 'Three months of unbroken nutrition.';
    if (months === 6) return 'Half a year. Two seasons of clarity.';
    if (months === 12) return 'A full year. A field that is yours by name.';
    return 'Commitment-Based Agriculture';
  }

  getPlanCustomSub(months: number): string {
    if (months === 1) return 'Your first experience of genuinely traced, tested grain. Cancel before next billing — no questions asked.';
    if (months === 3) return "You're starting to understand the difference. Three months gives you one full milling cycle and a season of batch reports.";
    if (months === 6) return 'The plan for households that have decided. You receive priority harvest allocation, seasonal variety previews, and farm visit eligibility.';
    if (months === 12) return 'Named plot stewardship. GPS coordinates. Quarterly soil reports. Your flour comes from a specific piece of land you can point to on a map.';
    return 'Secure your year-round supply of natural heirloom grain directly from the source.';
  }

  filteredBatches() {
    if (this.filter === 'All') return this.batches;
    if (this.filter === 'Pulses') {
      return this.batches.filter(b => b.variety.toLowerCase().includes('sesame') || b.variety.toLowerCase().includes('pulse'));
    }
    return this.batches.filter(b => b.variety.toLowerCase().includes(this.filter.toLowerCase()));
  }

  ngOnInit() {
    this.titleSvc.setTitle('The Batch Ledger — Every Harvest, Independently Tested | ANAAD Foods');
    this.metaSvc.updateTag({
      name: 'description',
      content: 'Open-access archive of 47 harvests, each verified by SGS India. Zero selective disclosure. Filter by crop, download reports, and verify every batch ID printed on your bag.'
    });

    this.subscriptionSvc.getPlans().subscribe({
      next: plans => {
        this.plans.set(plans.filter(p => p.is_available || p.is_active));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load subscription plans.');
        this.loading.set(false);
      }
    });
  }

  setFilter(f: string) { this.filter = f; }

  getDurationLabel(months: number): string {
    return months === 1 ? '1 Month' : `${months} Months`;
  }

  getDiscountLabel(plan: SubscriptionPlan): string {
    const pct = plan.total_discount_percentage || parseFloat(plan.discount_percentage || '0');
    return pct > 0 ? `${pct}% off` : '';
  }
}
