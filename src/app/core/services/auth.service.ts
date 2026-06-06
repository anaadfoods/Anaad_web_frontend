// ============================================
// Auth Service - FIXED & COMPLETE
// Handles all authentication API calls
// ============================================

import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, of, switchMap, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { API } from '../constants/api-endpoints';
import { AuthState } from '../state/auth.state';
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
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Registration ──────────────────────────

  register(req: RegisterRequest): Observable<UserProfile> {
    return this.http.post<{ data?: UserProfile; success?: boolean } | UserProfile>(API.AUTH.REGISTER, req).pipe(
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
    return this.http.post<LoginResponse>(API.AUTH.GOOGLE, body).pipe(
      tap(res => {
        this.authState.setTokens(res.access, res.refresh);
        if (res.user) this.authState.setUser(res.user);
      })
    );
  }

  appleLogin(idToken: string, name?: string): Observable<LoginResponse> {
    const body: AppleLoginRequest = { id_token: idToken, name };
    return this.http.post<LoginResponse>(API.AUTH.APPLE, body).pipe(
      tap(res => {
        this.authState.setTokens(res.access, res.refresh);
        if (res.user) this.authState.setUser(res.user);
      })
    );
  }

  // ── Token Management ──────────────────────

  refreshToken(): Observable<TokenRefreshResponse> {
    const refresh = this.authState.refreshToken();
    if (!refresh) return of({ access: '' });
    return this.http.post<TokenRefreshResponse>(API.AUTH.REFRESH, { refresh }).pipe(
      tap(res => {
        if (res.access) this.authState.setAccessToken(res.access);
      })
    );
  }

  testToken(): Observable<unknown> {
    return this.http.get(API.AUTH.TEST_TOKEN);
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

  // ── Logout ────────────────────────────────

  logout(): void {
    this.authState.logout();
    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate(['/login']);
    }
  }
}
