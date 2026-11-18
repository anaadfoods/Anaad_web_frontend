import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';

export interface CouponValidateResponse {
  valid: boolean;
  code: string;
  description?: string;
  coupon_type: 'PERCENTAGE' | 'FLAT';
  discount_percentage?: number | null;
  discount_amount: number;
  order_total: number;
  final_total: number;
  is_user_locked: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly http = inject(HttpClient);

  validateCoupon(code: string, orderTotal: number): Observable<CouponValidateResponse> {
    return this.http.post<CouponValidateResponse>(API.COUPONS.VALIDATE, {
      code: code.trim().toUpperCase(),
      order_total: orderTotal,
    });
  }
}
