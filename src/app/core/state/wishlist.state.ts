// ============================================
// Wishlist State Service
// Manages favorites with signals
// ============================================

import { computed, inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService, STORAGE_KEYS } from '../utils/storage.utils';

@Injectable({ providedIn: 'root' })
export class WishlistState {
  private readonly storage = inject(StorageService);
  private readonly platformId = inject(PLATFORM_ID);

  // ── Signals ───────────────────────────────
  private readonly _favoriteIds = signal<Set<number>>(new Set());
  private readonly _loading = signal<boolean>(false);

  // ── Computed ──────────────────────────────
  readonly favoriteIds = this._favoriteIds.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly count = computed(() => this._favoriteIds().size);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const cached = this.storage.getJSON<number[]>(STORAGE_KEYS.FAVORITES);
      if (cached) {
        this._favoriteIds.set(new Set(cached));
      }
    }
  }

  // ── Queries ───────────────────────────────

  isFavorite(variantId: number): boolean {
    return this._favoriteIds().has(variantId);
  }

  // ── Actions ───────────────────────────────

  setFavorites(ids: number[]): void {
    this._favoriteIds.set(new Set(ids));
    this.persistToStorage();
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  /** Toggle a favorite — returns new state (true=added, false=removed) */
  toggle(variantId: number): boolean {
    const current = new Set(this._favoriteIds());
    const wasAdded = !current.has(variantId);
    if (wasAdded) {
      current.add(variantId);
    } else {
      current.delete(variantId);
    }
    this._favoriteIds.set(current);
    this.persistToStorage();
    return wasAdded;
  }

  clear(): void {
    this._favoriteIds.set(new Set());
    this.storage.removeItem(STORAGE_KEYS.FAVORITES);
  }

  // ── Private ───────────────────────────────

  private persistToStorage(): void {
    const arr = Array.from(this._favoriteIds());
    this.storage.setJSON(STORAGE_KEYS.FAVORITES, arr);
  }
}
