import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API } from '../constants/api-endpoints';

export interface LegalDocument {
  id: number;
  title: string;
  content: string;
  version: string;
  is_terms_and_conditions: boolean;
  is_privacy_policy: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class LegalService {
  private readonly http = inject(HttpClient);

  getLatestLegal(): Observable<LegalDocument[]> {
    return this.http.get<any>(API.CORE.LEGAL).pipe(
      map((res: any) => {
        let current = res;
        while (current && current.data && typeof current.data === 'object' && !Array.isArray(current.data)) {
          current = current.data;
        }
        if (current && Array.isArray(current.data)) return current.data;
        if (current && Array.isArray(current.results)) return current.results;
        return Array.isArray(current) ? current : [];
      })
    );
  }
}
