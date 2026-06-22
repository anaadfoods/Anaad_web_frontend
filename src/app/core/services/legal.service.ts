import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';

export interface LegalDocument {
  type_display: string;   // "Terms & Conditions" | "Privacy Policy"
  version: string;
  content: string;        // Full HTML content
  is_active: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class LegalService {
  private readonly http = inject(HttpClient);

  getLatestLegal(): Observable<LegalDocument[]> {
    return this.http.get<LegalDocument[]>(API.CORE.LEGAL);
  }
}

