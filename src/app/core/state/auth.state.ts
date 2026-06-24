// ============================================
// Auth State Service
// Manages authentication state with signals
// ============================================

import { computed, inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserProfile } from '../models/auth.model';
import { StorageService, STORAGE_KEYS } from '../utils/storage.utils';

@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Signals ───────────────────────────────
  private readonly _user = signal<UserProfile | null>(null);
  private readonly _accessToken = signal<string | null>(null);
  private readonly _refreshToken = signal<string | null>(null);
  private readonly _loading = signal<boolean>(false);

  // ── Computed ──────────────────────────────
  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken() && !!this._user());
  readonly fullName = computed(() => {
    const u = this._user();
    if (!u) return '';
    return `${u.first_name} ${u.last_name}`.trim() || u.username;
  });
  readonly initials = computed(() => {
    const u = this._user();
    if (!u) return '';
    const first = u.first_name?.[0] ?? '';
    const last = u.last_name?.[0] ?? '';
    return (`${first}${last}`.toUpperCase() || u.username?.[0]?.toUpperCase()) ?? '?';
  });

  constructor() {
    // Hydrate from storage on browser only
    if (isPlatformBrowser(this.platformId)) {
      this.hydrateFromStorage();
    }
  }

  // ── Actions ───────────────────────────────

  setTokens(access: string, refresh: string): void {
    this._accessToken.set(access);
    this._refreshToken.set(refresh);
    // Access token → sessionStorage (clears on tab close)
    this.storage.sessionSet(STORAGE_KEYS.ACCESS_TOKEN, access);
    // Refresh token → localStorage (persists across sessions)
    this.storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
  }

  setAccessToken(access: string): void {
    this._accessToken.set(access);
    this.storage.sessionSet(STORAGE_KEYS.ACCESS_TOKEN, access);
  }

  setRefreshToken(refresh: string): void {
    this._refreshToken.set(refresh);
    this.storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
  }

  setUser(user: UserProfile): void {
    this._user.set(user);
    this.storage.setJSON(STORAGE_KEYS.USER_PROFILE, user);
  }

  updateUser(partial: Partial<UserProfile>): void {
    const current = this._user();
    if (current) {
      const updated = { ...current, ...partial };
      this.setUser(updated);
    }
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  logout(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    // Clear access token from sessionStorage
    this.storage.sessionRemove(STORAGE_KEYS.ACCESS_TOKEN);
    // Clear refresh token from localStorage
    this.storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    // Clear user profile from localStorage
    this.storage.removeItem(STORAGE_KEYS.USER_PROFILE);
    // Also clear legacy localStorage access token (migration cleanup)
    this.storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  // ── Private ───────────────────────────────

  private hydrateFromStorage(): void {
    // Access token: try sessionStorage first, then fall back to localStorage (migration)
    let access = this.storage.sessionGet(STORAGE_KEYS.ACCESS_TOKEN);
    if (!access) {
      // Migration: if access token is still in localStorage from before this change,
      // move it to sessionStorage and remove from localStorage
      access = this.storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (access) {
        this.storage.sessionSet(STORAGE_KEYS.ACCESS_TOKEN, access);
        this.storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      }
    }
    // Refresh token: always in localStorage
    const refresh = this.storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    // User profile: always in localStorage
    const user = this.storage.getJSON<UserProfile>(STORAGE_KEYS.USER_PROFILE);

    if (access) this._accessToken.set(access);
    if (refresh) this._refreshToken.set(refresh);
    if (user) this._user.set(user);
  }
}

