import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';

export interface State { id: number; name: string; }
export interface City { id: number; name: string; state: number; }

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);

  getStates(): Observable<State[]> {
    return this.http.get<State[]>(API.CORE.STATES);
  }

  getCities(stateId: number): Observable<City[]> {
    return this.http.get<City[]>(`${API.CORE.CITIES}?state_id=${stateId}`);
  }
}
