import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';

export interface RfpPlan {
  id: number;
  customer_number: string;
  status: string;
  plan_id: number;
  name: string;
  desc: string;
  duration: number;
  start_date: string;
  created_at: string;
  crop_type?: string;
  land_area?: string;
  duration_months?: number;
}

export interface RfpDelivery {
  id: number;
  delivery_date: string;
  iso_week_year: number;
  iso_week: number;
  delivery_seq_in_week: number;
  status: string;
  display_label: string;
  items_count?: number;
  notes?: string;
  items?: {
    plan_delivered: RfpDeliveryItem[];
    veggie_addons: RfpDeliveryItem[];
    product_addons: RfpDeliveryItem[];
  };
}

export interface RfpDeliveryItem {
  id: number;
  veg: { id: number; name: string; season: string };
  quantity: string;
  notes?: string;
  item_type: string;
}

@Injectable({ providedIn: 'root' })
export class RfpService {
  private readonly http = inject(HttpClient);

  getPlans(): Observable<RfpPlan[]> {
    return this.http.get<RfpPlan[]>(API.RFP.PLANS);
  }

  getPlanDeliveries(planId: number): Observable<RfpDelivery[]> {
    return this.http.get<RfpDelivery[]>(`${API.RFP.PLANS}${planId}/deliveries`);
  }

  getAllDeliveries(): Observable<RfpDelivery[]> {
    return this.http.get<RfpDelivery[]>(API.RFP.DELIVERIES);
  }

  getDeliveryDetail(deliveryId: number): Observable<RfpDelivery> {
    return this.http.get<RfpDelivery>(`${API.RFP.DELIVERIES}${deliveryId}`);
  }

  submitProposal(payload: { name: string; crop_type: string; land_area: string; duration_months: number; start_date: string; notes?: string }): Observable<any> {
    return this.http.post<any>(API.RFP.PLANS, payload);
  }

  acceptProposal(planId: number): Observable<any> {
    return this.http.post<any>(`${API.RFP.PLANS}${planId}/accept/`, {});
  }

  rejectProposal(planId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${API.RFP.PLANS}${planId}/reject/`, { reason });
  }
}
