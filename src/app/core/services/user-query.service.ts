import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../constants/api-endpoints';
import { UserQueryRequest } from '../models/user-query.model';

@Injectable({ providedIn: 'root' })
export class UserQueryService {
  private readonly http = inject(HttpClient);

  submitQuery(req: UserQueryRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API.USER_QUERIES.SUBMIT, req);
  }
}
