import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { API } from '../constants/api-endpoints';
import {
  TraceabilityJourney,
  TraceApiResponse,
  TraceFarmer,
  CropCycleOrdersResponse,
  ShiprocketOrderTracking,
  ShiprocketSubShipment
} from '../models/traceability.model';

@Injectable({ providedIn: 'root' })
export class TraceabilityService {
  private readonly http = inject(HttpClient);

  getJourney(params: { qrCode?: string; cropId?: string }): Observable<TraceabilityJourney> {
    let url = API.TRACEABILITY.TRACE;
    if (params.cropId) {
      url += `?crop_id=${encodeURIComponent(params.cropId)}`;
    } else {
      const qr = params.qrCode || 'QR-ANAAD-ATTA5KG-000045';
      url += `?qr=${encodeURIComponent(qr)}`;
    }

    return this.http.get<TraceApiResponse>(url, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => {
        if (response.success && response.journey) {
          return this.normalizeJourney(response.journey);
        }
        throw new Error('Invalid API response');
      }),
      catchError(err => {
        if (err.status === 401 || err.status === 403) {
          return throwError(() => new Error('API Authorization Error (401/403).'));
        }
        if (err.status === 404) {
          return throwError(() => new Error('Product not found.'));
        }
        if (err.status === 400) {
          return throwError(() => new Error('Invalid query.'));
        }
        return throwError(() => new Error('Something went wrong. Please try again later.'));
      })
    );
  }

  getCropOrders(cropCycleId: string, mobile: string): Observable<CropCycleOrdersResponse> {
    const url = `${API.CROP_DELIVERY.CROP_ORDERS}?crop_cycle_id=${encodeURIComponent(cropCycleId)}&mobile=${encodeURIComponent(mobile)}`;
    return this.http.get<CropCycleOrdersResponse>(url);
  }

  getOrderTracking(orderNumber: string): Observable<ShiprocketOrderTracking> {
    const params = new HttpParams().set('order_number', orderNumber);
    return this.http
      .get<ShiprocketOrderTracking | { data: ShiprocketOrderTracking }>(
        API.CROP_DELIVERY.TRACKING_BY_ORDER,
        { params }
      )
      .pipe(
        map(res => {
          if (res && typeof res === 'object' && 'data' in res && res.data) {
            return res.data;
          }
          return res as ShiprocketOrderTracking;
        }),
        map(tracking => ({
          ...tracking,
          tracking_events: tracking.tracking_events ?? [],
        }))
      );
  }

  getSubscriptionTracking(subscriptionNumber: string): Observable<ShiprocketSubShipment[]> {
    const params = new HttpParams().set('subscription_number', subscriptionNumber);
    return this.http
      .get<ShiprocketSubShipment[] | { data: ShiprocketSubShipment[] }>(
        API.CROP_DELIVERY.TRACKING_BY_SUBSCRIPTION,
        { params }
      )
      .pipe(
        map(res => {
          if (Array.isArray(res)) return res;
          if (res && typeof res === 'object' && 'data' in res && Array.isArray(res.data)) {
            return res.data;
          }
          return [];
        })
      );
  }

  private normalizeJourney(journey: TraceabilityJourney): TraceabilityJourney {
    const farmer = journey.cropCycle?.farmer;
    if (farmer && journey.cropCycle) {
      journey.cropCycle.farmer = this.normalizeFarmer(farmer);
    }
    return journey;
  }

  private normalizeFarmer(farmer: TraceFarmer): TraceFarmer {
    const raw = farmer as TraceFarmer & {
      photo_url?: string | null;
      photo?: string | null;
      image_url?: string | null;
    };
    const photoUrl = farmer.photoUrl ?? raw.photo_url ?? raw.photo ?? raw.image_url ?? null;
    return {
      ...farmer,
      photoUrl: photoUrl && photoUrl.trim().length > 0 ? photoUrl.trim() : null,
    };
  }
}