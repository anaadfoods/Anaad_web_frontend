// ============================================
// Auth Interceptor — FIXED
// Attaches JWT + handles 401 token refresh
// ============================================

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, shareReplay, switchMap, throwError, Observable } from 'rxjs';
import { AuthState } from '../state/auth.state';
import { HttpClient } from '@angular/common/http';
import { TokenRefreshResponse } from '../models/auth.model';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

/** URL suffixes / fragments that are public — no auth needed */
const PUBLIC_URL_FRAGMENTS = [
  '/api/auth/token/',
  '/api/auth/register/',
  '/api/auth/token/refresh/',
  '/api/auth/google/',
  '/api/auth/apple/',
  '/api/auth/send-otp/',
  '/api/auth/verify-otp/',
  '/api/products/variants',
  '/api/products/categories',
  '/api/products/featured',
  '/api/products/bestsellers',
  '/api/products/variants/search',
  '/api/core/banners',
  '/api/core/legal',
  '/api/core/states',
  '/api/core/cities',
  '/api/subscriptions/plans',
  '/api/blogs',
  '/api/research-papers',
  '/api/plans',
  '/api/user-queries',
];

function isPublicEndpoint(url: string): boolean {
  return PUBLIC_URL_FRAGMENTS.some(fragment => url.includes(fragment));
}

// Module-level refresh request to prevent duplicate refresh calls
let refreshRequest: Observable<TokenRefreshResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authState = inject(AuthState);
  const http = inject(HttpClient);
  const router = inject(Router);

  // Skip auth for public endpoints
  if (isPublicEndpoint(req.url)) {
    return next(req);
  }

  const token = authState.accessToken();
  let authReq = req;

  // Only attach the token if the request is destined for our Django backend
  const isBackendUrl = req.url.startsWith('/api/') || req.url.startsWith(environment.apiBaseUrl);

  if (token && isBackendUrl) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse): Observable<HttpEvent<unknown>> => {
      if (error.status === 401 && isBackendUrl && !isPublicEndpoint(req.url)) {
        const refreshToken = authState.refreshToken();

        if (!refreshToken) {
          authState.logout();
          router.navigate(['/login']);
          return throwError(() => error) as Observable<HttpEvent<unknown>>;
        }

        // Deduplicate concurrent refresh requests
        if (!refreshRequest) {
          refreshRequest = http.post<TokenRefreshResponse>(
            `${environment.apiBaseUrl}/api/auth/token/refresh/`,
            { refresh: refreshToken }
          ).pipe(
            shareReplay({ bufferSize: 1, refCount: false }),
            finalize(() => { refreshRequest = null; })
          );
        }

        return refreshRequest.pipe(
          switchMap((response: TokenRefreshResponse) => {
            authState.setAccessToken(response.access);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${response.access}` }
            });
            return next(retryReq);
          }),
          catchError((refreshError: unknown): Observable<HttpEvent<unknown>> => {
            authState.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError) as Observable<HttpEvent<unknown>>;
          })
        );
      }

      return throwError(() => error) as Observable<HttpEvent<unknown>>;
    })
  );
};
