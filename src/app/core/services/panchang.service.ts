import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { PanchangData } from '../models/common.model';

@Injectable({ providedIn: 'root' })
export class PanchangService {
  private readonly http = inject(HttpClient);

  getDay(params: PanchangQuery = {}): Observable<PanchangData> {
    return this.http.get<PanchangData>(API.PANCHANG.DAY, { params: this.toParams(params) });
  }

  getToday(params: PanchangQuery = {}): Observable<PanchangData> {
    return this.getDay(params);
  }

  getMonth(year: number, month: number, params: PanchangQuery = {}): Observable<unknown> {
    return this.http.get(API.PANCHANG.MONTH, {
      params: this.toParams({ ...params, year, month }),
    });
  }

  getHighlights(year: number, month: number, params: PanchangQuery = {}): Observable<unknown> {
    return this.http.get(API.PANCHANG.HIGHLIGHTS, {
      params: this.toParams({ ...params, year, month }),
    });
  }

  getFestivals(start: string, end: string, params: PanchangQuery = {}): Observable<unknown> {
    return this.http.get(API.PANCHANG.FESTIVALS, {
      params: this.toParams({ ...params, start, end }),
    });
  }

  searchFestivals(q: string, params: PanchangQuery = {}): Observable<unknown> {
    return this.http.get(API.PANCHANG.FESTIVAL_SEARCH, {
      params: this.toParams({ ...params, q }),
    });
  }

  getMuhurats(params: PanchangQuery = {}): Observable<unknown> {
    return this.http.get(API.PANCHANG.MUHURATS, { params: this.toParams(params) });
  }

  getVratCalendar(params: PanchangQuery = {}): Observable<unknown> {
    return this.http.get(API.PANCHANG.VRAT_CALENDAR, { params: this.toParams(params) });
  }

  getGuidanceToday(params: PanchangQuery = {}): Observable<unknown> {
    return this.http.get(API.PANCHANG.GUIDANCE_TODAY, { params: this.toParams(params) });
  }

  getGuidanceProfile(): Observable<unknown> {
    return this.http.get(API.PANCHANG.GUIDANCE_PROFILE);
  }

  saveGuidanceProfile(payload: Record<string, unknown>): Observable<unknown> {
    return this.http.post(API.PANCHANG.GUIDANCE_PROFILE, payload);
  }

  private toParams(query: PanchangQuery): HttpParams {
    return Object.entries({ tz: 'Asia/Kolkata', locale: 'en', ...query }).reduce(
      (params, [key, value]) =>
        value === undefined || value === null || value === ''
          ? params
          : params.set(key, String(value)),
      new HttpParams()
    );
  }
}

export interface PanchangQuery {
  date?: string;
  year?: number;
  month?: number;
  start?: string;
  end?: string;
  q?: string;
  type?: string;
  types?: string;
  days?: number;
  tz?: string;
  locale?: string;
  calendar_system?: 'amanta' | 'purnimanta';
  profile?: string;
  lat?: number;
  lon?: number;
}
