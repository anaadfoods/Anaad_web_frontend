// ============================================
// Address Service
// Handles multiple user address management via /api/auth/addresses/
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { UserAddress } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly http = inject(HttpClient);

  /** List all saved addresses for the authenticated user */
  getAddresses(): Observable<UserAddress[]> {
    return this.http.get<{ data?: UserAddress[] } | UserAddress[]>(API.AUTH.ADDRESSES).pipe(
      map(res => {
        if (Array.isArray(res)) return res;
        if ('data' in res && Array.isArray(res.data)) return res.data;
        return [];
      })
    );
  }

  /** Create a new address */
  createAddress(payload: Omit<UserAddress, 'id' | 'created_at' | 'updated_at'>): Observable<UserAddress> {
    return this.http.post<{ data?: UserAddress } | UserAddress>(API.AUTH.ADDRESSES, payload).pipe(
      map(res => ('data' in res && res.data ? res.data : res as UserAddress))
    );
  }

  /** Update an existing address */
  updateAddress(id: number, payload: Partial<UserAddress>): Observable<UserAddress> {
    return this.http.put<{ data?: UserAddress } | UserAddress>(`${API.AUTH.ADDRESSES}${id}/`, payload).pipe(
      map(res => ('data' in res && res.data ? res.data : res as UserAddress))
    );
  }

  /** Delete an address */
  deleteAddress(id: number): Observable<void> {
    return this.http.delete<void>(`${API.AUTH.ADDRESSES}${id}/`);
  }

  /** Mark an address as default */
  setDefaultAddress(id: number): Observable<UserAddress> {
    return this.http.post<{ data?: UserAddress } | UserAddress>(`${API.AUTH.ADDRESSES}${id}/set_default/`, {}).pipe(
      map(res => ('data' in res && res.data ? res.data : res as UserAddress))
    );
  }
}

