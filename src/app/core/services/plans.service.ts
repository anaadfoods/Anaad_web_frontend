import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface ApiPlan {
  id: number;
  name: string;
  duration_months: number;
  discount_percentage: string;
  total_discount_percentage: number;
  tagline: string;
  description: string;
  is_active: boolean;
  activation_date: string;
  is_one_time_only: boolean;
  allows_installments: boolean;
  installment_frequency_months: number;
  is_available: boolean;
}

export interface PlanCard {
  id: string;
  title: string;
  description: string;
  durationLabel: string;
  allowsInstallments: string;
  allowanceLabel: string;
  savingsLabel: string;
  isFeatured?: boolean;
  badge?: string;
  subtitle?: string;
  perks?: string[];
  price?: string;
  totalDiscountPercentage?: number;
}

@Injectable({ providedIn: 'root' })
export class PlansService {
  private http = inject(HttpClient);
  private endpoint = '/api/subscriptions/plans/';

  getPlans(): Observable<PlanCard[]> {
    return this.http.get<ApiPlan[] | { value: ApiPlan[] }>(this.endpoint).pipe(
      map(resp => {
        const list: ApiPlan[] = Array.isArray(resp) ? resp : (resp?.value ?? []);
        return list.map(p => this.toCard(p));
      })
    );
  }

  private toCard(p: ApiPlan): PlanCard {
    // Map API model to carousel card model
    const durationLabel = `${p.duration_months} Month${p.duration_months > 1 ? 's' : ''}`;
    const allowsInstallments = p.allows_installments ? 'Yes' : 'No';
    // Use duration as allowanceLabel (consistent with current UI), could be refined
    const allowanceLabel = durationLabel;
    const savingsLabel = `${Math.round(p.total_discount_percentage)}% Discount`;

    // Normalize any bad characters in API strings as a temporary client-side fix
    const fix = (s: string) => s?.replace(/â/g, "'") ?? '';
    const pickDesc = (a?: string, b?: string) => {
      const primary = (a ?? '').trim();
      if (primary && primary.toLowerCase() !== 'null' && primary.length > 2) return primary;
      const fallback = (b ?? '').trim();
      return fallback && fallback.toLowerCase() !== 'null' ? fallback : '';
    };

    let subtitle = fix(p.tagline) || 'Essential Staples';
    let description = fix(p.description) || '';
    
    // Default perks if none are provided
    let perks = [
      p.duration_months === 1 ? '1 Month supply' : p.duration_months === 3 ? '3 Months supply' : p.duration_months === 6 ? '6 Months supply' : '12 Months supply',
      "Pay in full upfront",
      `${Math.round(p.total_discount_percentage)}% Total Discount`
    ];

    return {
      id: String(p.id),
      title: fix(p.name),
      description: description,
      subtitle,
      perks,
      durationLabel,
      allowsInstallments,
      allowanceLabel,
      savingsLabel,
      totalDiscountPercentage: p.total_discount_percentage
    };
  }
}
