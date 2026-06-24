// ============================================
// Auth Interceptor
// Attaches JWT + handles 401 token refresh
// with proper concurrent request queuing
// ============================================

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError, Observable } from 'rxjs';
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
  '/api/blog/research-papers',
  '/api/plans',
  '/api/user-queries',
];

function isPublicEndpoint(url: string): boolean {
  return PUBLIC_URL_FRAGMENTS.some(fragment => url.includes(fragment));
}

// ── Module-level state for concurrent request handling ──
// isRefreshing: prevents multiple simultaneous refresh calls
// refreshTokenSubject: queues pending requests until new token arrives
let isRefreshing = false;
let refreshTokenSubject = new BehaviorSubject<string | null>(null);

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

  // Only attach the token if the request is destined for our Django backend
  const isBackendUrl = req.url.startsWith('/api/') || req.url.startsWith(environment.apiBaseUrl);

  if (!isBackendUrl) {
    return next(req);
  }

  // If a refresh is currently in-flight, queue this request
  if (isRefreshing) {
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => {
        const cloned = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next(cloned);
      })
    );
  }

  // Attach current access token
  const token = authState.accessToken();
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse): Observable<HttpEvent<unknown>> => {
      if (error.status === 401 && !isPublicEndpoint(req.url)) {
        return handleTokenRefresh(req, next, authState, http, router);
      }
      return throwError(() => error) as Observable<HttpEvent<unknown>>;
    })
  );
};

/**
 * Handles 401 responses by refreshing the access token.
 * Uses isRefreshing flag + BehaviorSubject to ensure:
 * 1. Only ONE refresh request is made even with concurrent 401s
 * 2. All pending requests wait and retry with the new token
 */
function handleTokenRefresh(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authState: AuthState,
  http: HttpClient,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    // Another request already triggered a refresh — wait for it
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap(token => {
        const retryReq = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next(retryReq);
      })
    );
  }

  // This request is the first to hit 401 — initiate refresh
  isRefreshing = true;
  refreshTokenSubject.next(null); // Reset so queued requests wait

  const refreshToken = authState.refreshToken();
  if (!refreshToken) {
    isRefreshing = false;
    authState.logout();
    router.navigate(['/login']);
    return throwError(() => new Error('No refresh token available')) as Observable<HttpEvent<unknown>>;
  }

  return http.post<TokenRefreshResponse>(
    `${environment.apiBaseUrl}/api/auth/token/refresh/`,
    { refresh: refreshToken }
  ).pipe(
    switchMap((response: TokenRefreshResponse) => {
      isRefreshing = false;

      // Store new tokens
      authState.setAccessToken(response.access);
      if (response.refresh) {
        authState.setRefreshToken(response.refresh);
      }

      // Notify all queued requests with the new access token
      refreshTokenSubject.next(response.access);

      // Retry the original request with the new token
      const retryReq = req.clone({
        setHeaders: { Authorization: `Bearer ${response.access}` }
      });
      return next(retryReq);
    }),
    catchError((refreshError: unknown): Observable<HttpEvent<unknown>> => {
      isRefreshing = false;
      refreshTokenSubject.next(null);
      authState.logout();
      router.navigate(['/login']);
      return throwError(() => refreshError) as Observable<HttpEvent<unknown>>;
    })
  );
}
