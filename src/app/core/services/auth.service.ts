// ============================================
// Auth Service - FIXED & COMPLETE
// Handles all authentication API calls
// ============================================

import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, of, switchMap, tap, catchError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { API } from '../constants/api-endpoints';
import { AuthState } from '../state/auth.state';
import { environment } from '../../../environments/environment';
import { DEV_BYPASS_ACCESS, DEV_BYPASS_REFRESH, isDevBypassSession } from '../utils/dev-auth.util';
import { NotificationService } from './notification.service';
import {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  TokenRefreshResponse,
  GoogleLoginRequest,
  AppleLoginRequest,
  OtpSendRequest,
  OtpVerifyRequest,
  UserProfile,
  ProfileUpdateRequest,
  Referral,
  ReferralRewardCount,
  ReferralsSummary,
  ChangePasswordRequest,
  ForgotPasswordSendOtpRequest,
  ForgotPasswordVerifyOtpRequest,
  ForgotPasswordResetRequest,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notificationSvc = inject(NotificationService);

  // ── Registration ──────────────────────────

  register(req: RegisterRequest): Observable<UserProfile> {
    const signupData = {
      ...req,
      device_id: this.notificationSvc.getOrCreateDeviceId()
    };
    return this.http.post<{ data?: UserProfile; success?: boolean } | UserProfile>(API.AUTH.REGISTER, signupData).pipe(
      map(res => {
        if ('data' in res && res.data) return res.data;
        return res as UserProfile;
      })
    );
  }

  // ── Login ─────────────────────────────────

  login(req: LoginRequest): Observable<LoginResponse> {
    this.authState.setLoading(true);
    return this.http.post<LoginResponse>(API.AUTH.LOGIN, req).pipe(
      tap(res => {
        this.authState.setTokens(res.access, res.refresh);
        if (res.user) this.authState.setUser(res.user);
      }),
      switchMap(res => res.user ? of(res) : this.fetchProfile().pipe(map(() => res))),
      finalize(() => this.authState.setLoading(false))
    );
  }

  googleLogin(idToken: string): Observable<LoginResponse> {
    const body: GoogleLoginRequest = { id_token: idToken };
    this.authState.setLoading(true);
    return this.http.post<LoginResponse>(API.AUTH.GOOGLE, body).pipe(
      tap(res => {
        this.authState.setTokens(res.access, res.refresh);
        if (res.user) this.authState.setUser(res.user);
      }),
      switchMap(res => res.user ? of(res) : this.fetchProfile().pipe(map(() => res))),
      finalize(() => this.authState.setLoading(false))
    );
  }

  appleLogin(idToken: string, name?: string): Observable<LoginResponse> {
    const body: AppleLoginRequest = { id_token: idToken, name };
    this.authState.setLoading(true);
    return this.http.post<LoginResponse>(API.AUTH.APPLE_LOGIN, body).pipe(
      tap(res => {
        this.authState.setTokens(res.access, res.refresh);
        if (res.user) this.authState.setUser(res.user);
      }),
      switchMap(res => res.user ? of(res) : this.fetchProfile().pipe(map(() => res))),
      finalize(() => this.authState.setLoading(false))
    );
  }

  // ── Token Management ──────────────────────

  refreshToken(): Observable<TokenRefreshResponse> {
    const refresh = this.authState.refreshToken();
    if (!refresh) return of({ access: '' });
    return this.http.post<TokenRefreshResponse>(API.AUTH.REFRESH, { refresh }).pipe(
      tap(res => {
        if (res.access) this.authState.setAccessToken(res.access);
        // Store rotated refresh token if backend returns one
        if (res.refresh) this.authState.setRefreshToken(res.refresh);
      })
    );
  }

  testToken(): Observable<unknown> {
    return this.http.get(API.AUTH.TEST_TOKEN);
  }

  // ── Session Initialization ─────────────────
  // Called on app startup to validate the current session.
  // Directly validates access token against profile API.
  // If expired (401), silently refreshes and then fetches profile.
  // If refresh also fails, logs the user out cleanly.

  initSession(): Observable<boolean> {
    // Dev bypass tokens are local-only — never validate against backend
    if (
      environment.devBypassAuth &&
      isDevBypassSession(this.authState.accessToken(), this.authState.refreshToken())
    ) {
      return of(true);
    }

    const access = this.authState.accessToken();
    const refresh = this.authState.refreshToken();

    if (!access && !refresh) {
      return of(false);
    }

    if (!access && refresh) {
      return this.refreshToken().pipe(
        switchMap(res => {
          if (res.access) {
            return this.fetchProfile().pipe(
              map(() => true),
              catchError(() => of(true))
            );
          }
          this.authState.logout();
          return of(false);
        }),
        catchError(() => {
          this.authState.logout();
          return of(false);
        })
      );
    }

    // We have an access token — validate it against GET /api/auth/profile/
    return this.fetchProfile().pipe(
      map(() => true),
      catchError(err => {
        // If 401 Unauthorized and refresh token exists, attempt silent refresh
        if (err.status === 401 && refresh) {
          return this.refreshToken().pipe(
            switchMap(res => {
              if (res.access) {
                return this.fetchProfile().pipe(
                  map(() => true),
                  catchError(() => of(true))
                );
              }
              this.authState.logout();
              return of(false);
            }),
            catchError(() => {
              this.authState.logout();
              return of(false);
            })
          );
        }
        // Non-401 error (e.g. temporary network offline), keep session if tokens exist
        return of(this.authState.isAuthenticated());
      })
    );
  }

  // ── OTP ───────────────────────────────────

  sendOtp(req: OtpSendRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API.AUTH.SEND_OTP, req);
  }

  verifyOtp(req: OtpVerifyRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API.AUTH.VERIFY_OTP, req);
  }

  // ── Profile ───────────────────────────────

  fetchProfile(): Observable<UserProfile> {
    return this.http.get<{ data?: UserProfile; status?: string } | UserProfile>(API.AUTH.PROFILE).pipe(
      map(res => {
        if (typeof res === 'object' && res !== null && 'data' in res && res.data) return res.data;
        return res as UserProfile;
      }),
      tap(profile => {
        if (profile?.email) this.authState.setUser(profile);
      })
    );
  }

  updateProfile(data: ProfileUpdateRequest): Observable<UserProfile> {
    return this.http.put<{ data?: UserProfile; status?: string } | UserProfile>(API.AUTH.PROFILE, data).pipe(
      map(res => {
        if (typeof res === 'object' && res !== null && 'data' in res && res.data) return res.data;
        return res as UserProfile;
      }),
      tap(profile => {
        if (profile?.email) this.authState.setUser(profile);
      })
    );
  }

  uploadProfilePicture(file: File): Observable<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return this.http.patch<{ success: boolean; message: string }>(API.AUTH.PROFILE, formData);
  }

  // ── Account Deactivation ──────────────────

  deactivate(password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API.AUTH.DEACTIVATE, { password });
  }

  deactivateConfirm(otp: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API.AUTH.DEACTIVATE_CONFIRM, { otp });
  }

  getReferrals(): Observable<ReferralsSummary> {
    return this.http.get<{ data?: ReferralsSummary; status?: string } | ReferralsSummary>(API.AUTH.REFERRALS).pipe(
      map(res => {
        if (typeof res === 'object' && res !== null && 'data' in res && res.data) return res.data;
        return res as ReferralsSummary;
      })
    );
  }

  getReferralRewardCount(): Observable<ReferralRewardCount> {
    return this.http.get<{ data?: ReferralRewardCount; status?: string } | ReferralRewardCount>(API.AUTH.REFERRAL_REWARD_COUNT).pipe(
      map(res => {
        if (typeof res === 'object' && res !== null && 'data' in res && res.data) return res.data;
        return res as ReferralRewardCount;
      })
    );
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  /** TEMP dev-only: fake session so protected routes work without backend login */
  devBypassLogin(): void {
    const user: UserProfile = {
      id: 9999,
      email: 'test@anaad.local',
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      phone_number: '',
      gender: '',
      address: null,
      pincode: null,
      city: null,
      state: null,
      profile_picture: null,
      referral_code: null,
      is_email_verified: true,
      is_rfp: false,
    };
    this.authState.setTokens(DEV_BYPASS_ACCESS, DEV_BYPASS_REFRESH);
    this.authState.setUser(user);
  }

  // ── Password Management ───────────────────

  changePassword(data: ChangePasswordRequest): Observable<{ message?: string; detail?: string }> {
    return this.http.post<{ message?: string; detail?: string }>(API.AUTH.CHANGE_PASSWORD, data);
  }

  forgotPasswordSendOtp(req: ForgotPasswordSendOtpRequest): Observable<{ message: string; type: string }> {
    return this.http.post<{ message: string; type: string }>(API.AUTH.FORGOT_PASSWORD_SEND_OTP, req);
  }

  forgotPasswordVerifyOtp(req: ForgotPasswordVerifyOtpRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API.AUTH.FORGOT_PASSWORD_VERIFY_OTP, req);
  }

  forgotPasswordReset(req: ForgotPasswordResetRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(API.AUTH.FORGOT_PASSWORD_RESET, req);
  }

  // ── Logout ────────────────────────────────

  logout(redirectUrl: string = '/login'): void {
    const refreshToken = this.authState.refreshToken();
    const accessToken = this.authState.accessToken();

    const doLocalCleanup = () => {
      this.executeLocalLogout(redirectUrl);
    };

    // If we have a refresh token, notify backend to blacklist/revoke it
    if (refreshToken && !isDevBypassSession(accessToken, refreshToken)) {
      this.http.post(API.AUTH.LOGOUT, { refresh: refreshToken }).pipe(
        catchError(() => of(null)), // Don't block client logout on network failure
        finalize(() => {
          this.notificationSvc.logoutDevice().pipe(
            catchError(() => of(null)),
            finalize(() => doLocalCleanup())
          ).subscribe();
        })
      ).subscribe();
    } else {
      if (this.authState.isAuthenticated()) {
        this.notificationSvc.logoutDevice().pipe(
          catchError(() => of(null)),
          finalize(() => doLocalCleanup())
        ).subscribe();
      } else {
        doLocalCleanup();
      }
    }
  }

  private executeLocalLogout(redirectUrl: string): void {
    this.authState.logout();
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate([redirectUrl]);
    }
  }
}

