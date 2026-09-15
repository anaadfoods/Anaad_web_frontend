import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';

export interface CouponData {
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  discount_amount: number;
  is_user_restricted: boolean;
}

export interface CouponValidateResponse {
  status: string;
  message?: string;
  coupon?: CouponData;
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly http = inject(HttpClient);

  validateCoupon(code: string, cartTotal: number): Observable<CouponValidateResponse> {
    return this.http.post<CouponValidateResponse>(API.COUPONS.VALIDATE, {
      code,
      cart_total: cartTotal,
    });
  }
}
