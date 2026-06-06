import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API } from '../constants/api-endpoints';

export interface UserSummaryData {
  orders: {
    by_status: Record<string, number>;
    total: number;
  };
  subscriptions: {
    active_by_plan: Record<string, number>;
    active_total: number;
  };
  favorites: {
    count: number;
  };
}

@Injectable({ providedIn: 'root' })
export class UserSummaryService {
  private readonly http = inject(HttpClient);

  getSummary(): Observable<UserSummaryData> {
    return this.http.get<{ status: string; data: UserSummaryData }>(API.CORE.USER_SUMMARY).pipe(
      map(res => res.data)
    );
  }
}
