import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserQueryPayload {
  name: string;
  phone_number: string;
  email: string;
  message: string;
  requirement_type: string;
  business_or_family_name: string;
  is_from_rfp: boolean;
}

export interface UserQueryResponse {
  id?: number;
  success?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class UserQueriesService {
  private http = inject(HttpClient);
  private endpoint = '/api/user-queries/';

  submitQuery(payload: UserQueryPayload): Observable<UserQueryResponse> {
    return this.http.post<UserQueryResponse>(this.endpoint, payload);
  }
}
