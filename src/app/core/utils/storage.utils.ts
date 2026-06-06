// ============================================
// SSR-Safe Storage Utilities
// Wraps localStorage/sessionStorage with
// isPlatformBrowser guards
// ============================================

import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // ── localStorage ──────────────────────────

  getItem(key: string): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage quota exceeded or private browsing
    }
  }

  removeItem(key: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }

  // ── JSON helpers ──────────────────────────

  getJSON<T>(key: string): T | null {
    const raw = this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setJSON<T>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore
    }
  }

  // ── sessionStorage ────────────────────────

  sessionGet(key: string): string | null {
    if (!this.isBrowser) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  sessionSet(key: string, value: string): void {
    if (!this.isBrowser) return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ignore
    }
  }

  sessionRemove(key: string): void {
    if (!this.isBrowser) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }

  /** Clear all app-specific keys from localStorage */
  clearAll(prefix = 'anaad_'): void {
    if (!this.isBrowser) return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}

// ── Storage key constants ─────────────────

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'anaad_access_token',
  REFRESH_TOKEN: 'anaad_refresh_token',
  USER_PROFILE: 'anaad_user_profile',
  CART_CACHE: 'anaad_cart_cache',
  FAVORITES: 'anaad_favorites',
} as const;
