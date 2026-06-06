// ============================================
// Banner Service
// Fetches homepage banners
// ============================================

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { Banner } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class BannerService {
  private readonly http = inject(HttpClient);

  getBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(API.CORE.BANNERS);
  }
}
